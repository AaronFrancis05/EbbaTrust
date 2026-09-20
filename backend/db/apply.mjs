#!/usr/bin/env node
/**
 * Migration runner.
 *
 * Applies the numbered files in backend/db/migrations/ in order, once each, recording what it
 * applied in public.schema_migrations along with a checksum of the file.
 *
 * It runs psql *inside the compose `db` container*, so the only thing this machine needs is
 * Docker. The same command targets the hosted project with `--remote`, without anyone
 * installing a Postgres client.
 *
 * **This runner is the only thing that applies migrations, to any environment.** Not the
 * Supabase CLI, not the Supabase MCP, not the SQL editor. Two tools means two ledgers — this
 * one records in public.schema_migrations, Supabase's records in
 * supabase_migrations.schema_migrations — and two ledgers means neither can answer "is this
 * database up to date?". One runner, one ledger, one answer.
 *
 * **The connection string never appears in an argument.** `--remote` reads
 * TARGET_DATABASE_URL from the environment or from backend/.env, and hands it to psql over
 * stdin as a \connect line. A password passed as argv is visible in `ps` to every user on the
 * machine and lands in shell history. AGENTS.md 5.2.
 *
 * Four refusals, all deliberate:
 *   - an already-applied file whose contents changed is an error, not a re-run. Editing
 *     applied history silently is how two environments quietly stop being the same database.
 *   - each file runs in one transaction. A half-applied migration is worse than none.
 *   - `reset` refuses to run against anything but the local container.
 *   - `seed` against a remote target demands SEED_REMOTE=yes. Demo parcels in a real database
 *     are indistinguishable from real ones the moment someone screenshots them.
 *
 * Usage:  node backend/db/apply.mjs <status|migrate|seed|reset> [--remote]
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, 'migrations');
const SEED_FILE = join(HERE, 'seed.sql');
const COMPOSE_FILE = join(HERE, '..', 'compose.yaml');
/** Long enough for a large migration on a slow link, short enough not to hang a terminal. */
const PSQL_TIMEOUT_MS = 120_000;

const [, , commandArg, ...rest] = process.argv;
const command = commandArg ?? 'status';
const remote = rest.includes('--remote');

function fail(message) {
  console.error(`\n  x ${message}\n`);
  process.exit(1);
}

if (rest.includes('--url')) {
  fail(
    '--url is gone: it put the password in the process list. Put the connection string in ' +
      'backend/.env as TARGET_DATABASE_URL and use --remote.'
  );
}

/**
 * Minimal .env reader. Deliberately not dotenv: this runs before any install step in a fresh
 * clone, and the file it reads is the one file in the repo that must never be committed.
 */
function readEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match === null) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

/**
 * The target, resolved but never printed. The environment wins over backend/.env so CI can
 * supply it without writing a file.
 */
const targetUrl = (() => {
  if (!remote) return null;
  const fromEnv = process.env.TARGET_DATABASE_URL;
  const url = fromEnv ?? readEnvFile(join(HERE, '..', '.env')).TARGET_DATABASE_URL;
  if (url === undefined || url.trim() === '') {
    fail(
      '--remote needs TARGET_DATABASE_URL. Put it in backend/.env (gitignored) or export it. ' +
        'See backend/README.md for the connection string to use.'
    );
  }
  return url.trim();
})();

/**
 * psql reads the target from stdin, not from argv. Everything after this line goes down a
 * pipe, so the password is never an argument to any process.
 */
const connectPrelude = targetUrl === null ? '' : `\\connect "${targetUrl}"\n`;

/** Describes where we are pointed without ever revealing the credentials in it. */
function describeTarget() {
  if (targetUrl === null) return 'local container (compose service "db")';
  const host = /@([^/:?]+)/.exec(targetUrl)?.[1] ?? 'unknown host';
  return `remote: ${host}`;
}

/** Run SQL through psql in the db container. Returns stdout; throws on any SQL error. */
function psql(sql, { quiet = false } = {}) {
  const args = [
    'compose', '-f', COMPOSE_FILE, 'exec', '-T', 'db',
    // -w: never prompt for a password. Without it, a wrong or missing one makes psql read the
    // prompt's answer from the script on stdin and hang instead of failing.
    'psql', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-w', '-f', '-',
  ];

  const result = spawnSync('docker', args, {
    input: connectPrelude + sql,
    encoding: 'utf8',
    // A remote target that accepts the TCP connection but never answers will otherwise hang
    // here forever: libpq's connect_timeout does not cover a server that connects and then
    // goes quiet. Better to stop and say so than to sit at a blank prompt.
    timeout: PSQL_TIMEOUT_MS,
  });

  if (result.signal === 'SIGTERM') {
    fail(
      `psql did not answer within ${PSQL_TIMEOUT_MS / 1000}s against ${describeTarget()}. ` +
        'Check the host, port and credentials — a wrong password on the Supabase pooler can ' +
        'hang rather than refuse.'
    );
  }
  if (result.error) fail(`could not run docker: ${result.error.message}`);
  if (result.status !== 0) {
    // Never swallowed: the whole point of this script is that a failed migration is loud.
    process.stderr.write(result.stderr ?? '');
    fail(`psql exited ${result.status}`);
  }
  if (!quiet && result.stderr?.trim()) process.stderr.write(result.stderr);
  return result.stdout ?? '';
}

/** A single value back from psql, with no table decoration around it. */
function psqlValue(sql) {
  const args = [
    'compose', '-f', COMPOSE_FILE, 'exec', '-T', 'db',
    'psql', '-v', 'ON_ERROR_STOP=1', '-X', '-t', '-A', '-q', '-w', '-f', '-',
  ];
  // -f - rather than -c, so the \connect line can travel with the query on stdin.
  const result = spawnSync('docker', args, {
    input: connectPrelude + sql,
    encoding: 'utf8',
    timeout: PSQL_TIMEOUT_MS,
  });
  if (result.signal === 'SIGTERM') {
    fail(`psql did not answer within ${PSQL_TIMEOUT_MS / 1000}s against ${describeTarget()}.`);
  }
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '');
    fail(`psql exited ${result.status}`);
  }
  // \connect writes "You are now connected to..." to stdout. Keep only the query's own answer.
  const lines = (result.stdout ?? '').split(/\r?\n/).filter((line) => !/^You are now connected/.test(line));
  return lines.join('\n').trim();
}

const checksum = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      return { version: name.replace(/\.sql$/, ''), name, sql, checksum: checksum(sql) };
    });
}

/**
 * Creates the ledger if needed and reads it back in a single round trip.
 *
 * One connection, not two. Every psql invocation here is a fresh connection, a fresh DNS
 * lookup and a fresh pooler session; against a remote host that adds up to a flaky run for no
 * reason. Applying nine migrations should cost two connections in total, not a dozen.
 */
function appliedMap() {
  const raw = psqlValue(
    `create table if not exists public.schema_migrations (
       version text primary key,
       checksum text not null,
       applied_at timestamptz not null default now()
     );
     -- The ledger gets the same wall as everything else. It is created here rather than by a
     -- migration, so 0008 never sees it — and a table that lists the schema's entire history
     -- is a map of the database handed to anyone holding the anon key.
     alter table public.schema_migrations enable row level security;
     do $ledger$
     begin
       -- The roles exist on Supabase from the start; locally 0008 creates them, which may not
       -- have run yet the first time this ledger is written.
       if exists (select 1 from pg_roles where rolname = 'anon') then
         revoke all on public.schema_migrations from anon;
       end if;
       if exists (select 1 from pg_roles where rolname = 'authenticated') then
         revoke all on public.schema_migrations from authenticated;
       end if;
     end
     $ledger$;
     select coalesce(string_agg(version || '=' || checksum, ','), '') from public.schema_migrations;`
  );
  const map = new Map();
  for (const pair of raw.split(',').filter(Boolean)) {
    const [version, sum] = pair.split('=');
    map.set(version, sum);
  }
  return map;
}

/** SQL-literal quoting for the ledger insert. Values here are our own filenames and hashes. */
const quote = (value) => `'${value.replace(/'/g, "''")}'`;

function migrate() {
  const already = appliedMap();
  const files = migrationFiles();
  const pending = [];

  for (const file of files) {
    const previous = already.get(file.version);
    if (previous === undefined) {
      pending.push(file);
      continue;
    }
    if (previous !== file.checksum) {
      fail(
        `${file.name} was already applied but its contents have changed ` +
          `(${previous} -> ${file.checksum}). Write a new migration instead of editing this one.`
      );
    }
    console.log(`  = ${file.name} (already applied)`);
  }

  if (pending.length === 0) {
    console.log('\n  Schema already up to date.');
    return;
  }

  /**
   * Every pending file in one session, each still inside its own transaction. ON_ERROR_STOP
   * abandons the rest on the first failure, so a run that dies half way leaves the files that
   * did succeed applied *and* recorded — rerunning picks up exactly where it stopped.
   */
  const script = pending
    .map(
      (file) =>
        `\\echo '  + ${file.name}'\n` +
        `begin;\n${file.sql}\n` +
        `insert into public.schema_migrations (version, checksum) ` +
        `values (${quote(file.version)}, ${quote(file.checksum)});\ncommit;\n`
    )
    .join('\n');

  psql(script);
  console.log(`\n  ${pending.length} migration(s) applied.`);
}

function status() {
  const already = appliedMap();
  for (const file of migrationFiles()) {
    const previous = already.get(file.version);
    const mark = previous === undefined ? 'pending' : previous === file.checksum ? 'applied' : 'CHANGED SINCE APPLY';
    console.log(`  ${mark.padEnd(20)} ${file.name}`);
  }
}

function seed() {
  if (targetUrl !== null && process.env.SEED_REMOTE !== 'yes') {
    fail(
      'refusing to seed a remote database. Demo parcels are indistinguishable from real ones ' +
        'once they are in there. Set SEED_REMOTE=yes if you genuinely mean it.'
    );
  }
  console.log('  Seeding demo data (AGENTS.md 5.3 — every row is marked as demo).');
  psql(readFileSync(SEED_FILE, 'utf8'));
  const parcels = psqlValue('select count(*) from public.parcels');
  console.log(`\n  ${parcels} parcel(s) present.`);
}

function reset() {
  if (targetUrl !== null) {
    fail('reset refuses to run against --remote. Drop and recreate a hosted database deliberately, by hand.');
  }
  console.log('  Dropping and recreating schema public in the local container.');
  psql(`drop schema public cascade; create schema public;`, { quiet: true });
  migrate();
  seed();
}

console.log(`  Target: ${describeTarget()}\n`);

switch (command) {
  case 'migrate':
    migrate();
    break;
  case 'status':
    status();
    break;
  case 'seed':
    seed();
    break;
  case 'reset':
    reset();
    break;
  default:
    fail(`unknown command "${command}". Use status, migrate, seed or reset.`);
}
