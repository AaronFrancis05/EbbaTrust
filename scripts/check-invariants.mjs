#!/usr/bin/env node
/**
 * Guards the two AGENTS.md invariants that cannot be expressed as lint rules.
 * Run via `npm run check:invariants`. Exits non-zero on violation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
let failures = 0;

const fail = (msg) => {
  console.error(`  x ${msg}`);
  failures += 1;
};

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (['node_modules', '.git', '.expo', '.agents', 'dist'].includes(entry)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Strip comments so documentation references don't trip the boundary check. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// -- Invariant 1: the adapter boundary (AGENTS.md 4.3) -----------------------
// No external service may be named in executable code outside services/adapters/.
// This is what lets the product ship before any government agreement exists.
const FORBIDDEN = [
  { re: /\bUgNLIS\b/i, name: 'UgNLIS' },
  { re: /\bNIRA\b/, name: 'NIRA' },
  { re: /\bMTN\b/, name: 'MTN' },
  { re: /\bAirtel\b/i, name: 'Airtel' },
];
// Adapters moved server-side in Step 3 (PLAN.md 3.1): they carry API keys, and a secret
// shipped inside a mobile binary is a published secret.
const ADAPTER_DIR = join('backend', 'api', 'src', 'adapters');

const CLIENT_DIRS = [join(ROOT, 'app'), join(ROOT, 'src')];
const SERVER_DIRS = [join(ROOT, 'backend', 'api', 'src')];

console.log('Invariant 1 - adapter boundary (AGENTS.md 4.3)');
let checked = 0;
for (const file of [...CLIENT_DIRS, ...SERVER_DIRS].flatMap((dir) => walk(dir))) {
  const rel = relative(ROOT, file);
  if (rel.startsWith(ADAPTER_DIR + sep)) continue;
  checked += 1;
  stripComments(readFileSync(file, 'utf8'))
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('boundary-ok')) return;
      for (const { re, name } of FORBIDDEN) {
        if (re.test(line)) fail(`${rel}:${i + 1} names "${name}" outside ${ADAPTER_DIR}/`);
      }
    });
}
console.log(`  checked ${checked} files outside the adapter layer`);

// -- Invariant 2: token parity (AGENTS.md 6) ---------------------------------
// tailwind.config.js and src/lib/theme/tokens.ts must never diverge.
console.log('Invariant 2 - token parity (AGENTS.md 6)');
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null ? flatten(v, key) : [[key, String(v)]];
  });

const twColors = require(join(ROOT, 'tailwind.config.js')).theme.extend.colors;
const tokensSrc = readFileSync(join(ROOT, 'src/lib/theme/tokens.ts'), 'utf8');
const pairs = flatten(twColors);
for (const [key, value] of pairs) {
  if (!tokensSrc.includes(value)) {
    fail(`tokens.ts missing colour ${key} (${value}) from tailwind.config.js`);
  }
}
console.log(`  checked ${pairs.length} colour values`);

// -- Invariant 3: the client/server split (AGENTS.md 4.1 and 4.6) ------------
// The app reaches data through src/services/api/. It authenticates with Supabase and does
// nothing else with it: no table queries, and never the service-role key, which bypasses RLS
// and would be readable by anyone who unpacks the APK.
console.log('Invariant 3 - client/server split (AGENTS.md 4.1, 4.6)');
const CLIENT_FORBIDDEN = [
  { re: /\.from\(\s*['"`]/, what: 'a Supabase table query — call the API in src/services/api/' },
  { re: /service_role|SERVICE_ROLE/, what: 'the service-role key — it belongs in backend/ only' },
];

let clientChecked = 0;
for (const file of CLIENT_DIRS.flatMap((dir) => walk(dir))) {
  const rel = relative(ROOT, file);
  clientChecked += 1;
  stripComments(readFileSync(file, 'utf8'))
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('boundary-ok')) return;
      for (const { re, what } of CLIENT_FORBIDDEN) {
        if (re.test(line)) fail(`${rel}:${i + 1} contains ${what}`);
      }
    });
}
console.log(`  checked ${clientChecked} client files`);

if (failures > 0) {
  console.error(`\n${failures} invariant violation(s). See AGENTS.md.`);
  process.exit(1);
}
console.log('\nAll invariants hold.');
