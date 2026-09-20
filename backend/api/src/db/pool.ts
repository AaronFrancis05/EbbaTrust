/**
 * The database connection pool.
 *
 * One pool for the process, created at boot and closed on shutdown. Everything that touches
 * Postgres goes through here, so there is a single place where connection limits, statement
 * timeouts and TLS are decided.
 *
 * This service connects with a role that bypasses RLS (PLAN.md 3.1). That is the point of the
 * split — the rules live in backend/api/src/domain/, not in policies — but it also means a
 * query written here has no second net under it. Read the RLS note in
 * backend/db/migrations/0008_rls.sql before assuming otherwise.
 */
import pg from 'pg';

import type { Config } from '../config.js';

export type Database = pg.Pool;

/**
 * Postgres returns bigint as a string because it does not fit in a JS number. Money is stored
 * in UGX minor units as bigint (AGENTS.md 5.4), so leaving the default in place is correct:
 * a silent conversion to a float is exactly the bug the integer storage exists to prevent.
 * Callers convert explicitly, where the loss of precision would be visible.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => value);

/**
 * Supabase offers three ways in. Two of them are a session (direct, and the session pooler on
 * 5432); the third is the transaction pooler on 6543, which hands a different backend to every
 * transaction and drops connection-time `options`. Detected rather than configured, because
 * the difference is visible in the URL and a second env var would only be another thing to
 * get wrong.
 */
function isTransactionPooler(url: string): boolean {
  try {
    return new URL(url).port === '6543';
  } catch {
    // A malformed URL is the pool's problem to report, not this helper's to guess at.
    return false;
  }
}

export function createPool(config: Config): Database {
  const transactionPooler = isTransactionPooler(config.databaseUrl);

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    // A connection idle this long is cheaper to reopen than to hold against the server's limit.
    idleTimeoutMillis: 30_000,
    // Fail fast on an unreachable database rather than hanging a request for a minute.
    connectionTimeoutMillis: 5_000,
    // No single query should be able to pin a connection. The map queries are indexed; a
    // query that takes longer than this is a bug we want to see, not wait for.
    statement_timeout: 10_000,
    query_timeout: 10_000,
    application_name: 'ebbatrust-api',
    /**
     * PostGIS is installed in the `extensions` schema, not `public` — that is where Supabase
     * puts it, and backend/db/migrations/0001 does the same locally so the two match. Without
     * it on the search_path, every spatial function in every query fails to resolve.
     *
     * Migration 0009 sets this on the database itself, which covers every connection however
     * it was opened. This repeats it on ours so a database we did not migrate still works —
     * except through the transaction pooler, which rejects connection options outright.
     */
    ...(transactionPooler ? {} : { options: '-c search_path=public,extensions' }),
    // Supabase terminates TLS with a certificate this container does not have a CA for.
    // Encrypted, unverified — acceptable to a managed host over the provider's own network,
    // and revisited in Step 9 when the CA bundle ships with the image.
    ssl: /supabase\.(co|com)/.test(config.databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

  /**
   * An idle client can fail while nobody is awaiting it — a database restart, a dropped
   * connection. Without this listener that error is an unhandled 'error' event, which takes
   * the whole process down. AGENTS.md 4.5: handled where it occurs, never swallowed.
   */
  pool.on('error', (error) => {
    console.error('idle database client error:', error.message);
  });

  return pool;
}

/** Cheap liveness check for the readiness probe. Returns true only on a real round trip. */
export async function pingDatabase(pool: Database): Promise<boolean> {
  const result = await pool.query<{ ok: number }>('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
