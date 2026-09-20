# PLAN.md — EbbaTrust System Plan

The build sequence for the EbbaTrust mobile prototype.
Operating rules live in [AGENTS.md](AGENTS.md). Live progress lives in [MEMORY.md](MEMORY.md).

**Status:** Steps 0-4 complete (Step 4 applied locally; the hosted apply is outstanding).
Step 5 next.
**Last updated:** 2026-09-20

---

## 1. What we are building

A React Native (Expo) application for Uganda that lets a buyer:

1. Prove who they are (phone OTP + NIN capture)
2. Browse land and property listings with their verification status shown plainly
3. See a parcel's real boundary on satellite imagery
4. Request a title verification routed to the national registry
5. Pay through escrow that only releases once transfer conditions are verified

**The product promise:** you should not be able to lose your money to a fake title while
using this app.

## 2. What makes it viable

Uganda's **UgNLIS** is the authoritative registry, backed by roughly $65M of World Bank
funding and already cross-checking against NIRA, URA and others. We do not compete with it.
We are the consumer layer on top of it.

But we have **no data-sharing agreement** with MLHUD, no NIRA integration and no mobile-money
licence — and may not have them for a year. So:

> **Every external dependency sits behind an adapter interface with a working mock.**

The full product is buildable, demoable and user-testable today. Going live later changes one
factory function. This converts the project's biggest commercial risk into a config value.
See [AGENTS.md §4.3](AGENTS.md).

## 3. Stack

| Layer | Choice |
|---|---|
| App | Expo SDK 57, expo-router, TypeScript 5.9 strict |
| Styling | NativeWind v4 (`/imprint` reads Tailwind classes verbatim) |
| Client state | TanStack Query |
| **Backend** | **Own API service in `backend/` — Node + Fastify + TypeScript, containerised** |
| **Runtime** | **Docker + Docker Compose locally · Kubernetes manifests for deployment** |
| Data layer | Supabase (managed) — Postgres + **PostGIS**, phone OTP auth, Storage |
| Maps | react-native-maps + Google Maps (satellite, polygon overlays) |
| Errors | Sentry |
| Distribution | EAS Build → Play Internal Testing → TestFlight |

### 3.1 Topology — decided 2026-09-20

The mobile app no longer talks to the database. Domain logic lives in a service we run.

```
┌─────────────┐    JWT     ┌──────────────────┐   service role   ┌──────────────┐
│  Expo app   │ ─────────▶ │  backend/ API    │ ───────────────▶ │  Supabase    │
│  (client)   │            │  Fastify · Docker│                  │  Postgres +  │
│             │            │  · Kubernetes    │                  │  PostGIS     │
└─────────────┘            └──────────────────┘                  │  Auth·Storage│
      │                            │                             └──────────────┘
      │ phone OTP (supabase-js)    │ registry · identity · payments
      └───────────────────────────▶│  ── adapters live HERE, not in the app ──
                                   ▼
                          external services (mocked)
```

**Why hybrid rather than self-hosting everything:** running the full Supabase stack on a
laptop is roughly eight containers for no product benefit at this stage. Keeping Postgres,
auth and Storage managed while owning the *logic* gets the thing that actually matters —
verification and escrow rules enforced on a server rather than in a phone the user controls.

**Four consequences that change how we build:**

1. **Adapters move server-side.** `registry`, `identity` and `payments` now live in
   `backend/api/src/adapters/`, not `src/services/adapters/`. They need API keys, and a
   secret shipped inside a mobile binary is a published secret. `scripts/check-invariants.mjs`
   must be repointed at the new adapter directory in Step 3, or [AGENTS.md §4.3](AGENTS.md)
   stops being enforced.
2. **The escrow state machine is server-authoritative.** A transition the client can compute
   is a transition the client can forge. The app displays state; `backend/` decides it.
3. **The app keeps supabase-js for authentication only** — phone OTP and session refresh. It
   holds no `service_role` key, issues no queries, and reads no tables directly.
4. **RLS stays on anyway.** The backend uses the service role, so RLS is not its gatekeeper.
   It remains deny-by-default as a second wall: if a key ever leaks, the blast radius is a
   closed door rather than the whole database.

### 3.2 Backend layout

```
backend/
├── api/
│   ├── src/
│   │   ├── routes/          # HTTP surface, thin
│   │   ├── domain/          # escrow state machine, verification rules
│   │   ├── adapters/        # registry · identity · payments  ◆ critical layer
│   │   ├── db/              # Supabase/Postgres access
│   │   └── auth/            # JWT verification
│   ├── Dockerfile
│   └── package.json
├── db/
│   └── migrations/          # SQL + PostGIS + RLS (moved from supabase/migrations/)
├── k8s/
│   ├── deployment.yaml      # namespace + configmap + deployment + service
│   └── secret.example.yaml  # committed shape only — never real values
└── compose.yaml             # what you run day to day
```

---

## 4. Build sequence

Every step runs: **`/architect` → build → `/imprint` → `/review` → `/remember save`**

### Step 0 — Governance ✅ COMPLETE
`AGENTS.md`, `CLAUDE.md`, `PLAN.md`, `MEMORY.md`, `ui-registry.md`, `README.md`. No code.

### Step 1 — Scaffold ✅ COMPLETE
Expo SDK 57 + expo-router + TS 5.9 strict + NativeWind v4 + Tailwind 3.4 + tokens mirrored in
`tailwind.config.js` and `src/lib/theme/tokens.ts` + ESLint 9 + Prettier + folder structure
per AGENTS.md §3 + `scripts/check-invariants.mjs`.
**Verified:** `npm run check` passes (typecheck + lint + invariants); `expo export` bundles
for Android with tokens present in the output.

**Version constraints discovered — do not "upgrade" these blindly:**
- **TypeScript pinned to 5.9.3.** TS 7 (the Go port) breaks `@typescript-eslint`:
  `ts-api-utils` reads TS 5 internals TS 7 does not expose. `expo install typescript`
  resolves to 7.x, so the pin is deliberate and must be kept.
- **Tailwind pinned to 3.4.19.** NativeWind 4 is built against Tailwind 3's JS config.
  NativeWind's peer range (`>3.3.0`) wrongly permits Tailwind 4. NativeWind 5 (Tailwind 4)
  is still RC — revisit when it ships stable.
- **react-dom pinned to match react (19.2.3).** A transitive `react-dom@19.3.0` conflicts
  with the SDK-pinned react and blocks installs.

### Step 2 — UI primitives ✅ COMPLETE
`Button`, `Card`, `Input`, `Badge`, `StatusPill`, `EmptyState`, `Skeleton`, `Disclosure` in
`src/components/ui/`, plus the gallery screen `app/index.tsx`.
- Icons: `lucide-react-native` + `react-native-svg` — lucide's names already match
  `statusTokens.icon` exactly, so there is no rename map.
- Variants: typed `Record<Variant, string>` class maps, so `/imprint` reads literal classes.
- Animation: React Native `Animated`, not Reanimated — avoids `react-native-worklets`.
- Added the `danger-900` token: the destructive button's pressed state previously resolved to
  its own rest colour, leaving the most dangerous button with no press feedback.

**Verified:** `npm run check` clean; `expo export --platform android` bundles (6.1MB);
all eight primitives imprinted in `ui-registry.md` with zero conflicts and no hardcoded values.

### Step 3 — Backend service skeleton ✅ COMPLETE
Stood up `backend/` end to end before any domain logic went into it.
- Fastify + TypeScript API, strict, with a `/health` endpoint and structured logging.
- `Dockerfile` (multi-stage, non-root user) and `backend/compose.yaml` for daily work.
- `backend/k8s/` manifests, applied against **Docker Desktop's built-in Kubernetes**
  (Settings → Kubernetes → Enable). Docker 29.7.2 and kubectl v1.36.1 are already installed;
  no cluster or context exists yet, so the toggle is a prerequisite for this step.
- Adapter layer relocated to `backend/api/src/adapters/`, each with `index.ts` (interface +
  factory), `mock.ts` and a provider stub throwing `NotImplementedError`.
- `scripts/check-invariants.mjs` repointed at the new adapter path, and extended to fail if
  the mobile app imports a Supabase table query.
- Typed API client in `src/services/api/` for the app to call.

**Verified:**
- `docker compose -f backend/compose.yaml up --build` → container reports `(healthy)`, runs as
  `uid=1000(node)`, and `/health` returns `{"status":"ok","adapterMode":"mock","demoData":true}`.
- `kubectl apply -f backend/k8s/deployment.yaml` → pod `1/1 Running`, 0 restarts, separate
  liveness (`/health`) and readiness (`/ready`) probes registered; answers over a port-forward.
  Docker Desktop's kind-type cluster reads the locally built image, so nothing is pushed.
- `npm run check` passes: app typecheck, **backend typecheck**, lint, three invariants.
- Invariants tested against a deliberate violation file — all three fired and exited 1.
- No secret committed: `.env.example` and `k8s/secret.example.yaml` hold empty values only.

**Deviation from the original wording:** `AGENTS.md` was updated as part of this step (§3
structure, §4.1, §4.3, new §4.6, §5.2, §6, §9), because it still described adapters living in
`src/services/adapters/`. Leaving it stale would have had `/review` check the app against rules
that no longer describe it.

### Step 4 — Data model ✅ COMPLETE (locally)
Eight numbered migrations in `backend/db/migrations/` covering all seven tables, applied to a
local `postgis/postgis:17-3.5` container added to `backend/compose.yaml`. The same files are
written to apply unchanged to the hosted project — **that apply has not happened yet** (see
open question 2).

- **RLS deny-all, zero policies** (`0008_rls.sql`), plus `REVOKE` on `anon`/`authenticated`
  and `force row level security`. One file holds the whole posture so it reads at a glance.
- **NIN is hashed**, never stored in plaintext: `nin_hash` + `nin_last4`, pepper in the
  backend environment. A database dump leaks no national IDs. Accepted cost: re-verification
  needs the user to re-enter it.
- **`is_demo_data` is NOT NULL with no default** on `verification_results` — a result cannot
  be written without declaring its provenance (AGENTS.md §5.3).
- **`audit_log` is append-only by trigger**, not by convention. `UPDATE` and `DELETE` raise.
- **Seed is outside the migration chain** (`backend/db/seed.sql`, `npm run db:seed`), so demo
  parcels cannot reach production by running the chain. Areas are derived from the polygons
  rather than typed, so the demo data contains no discrepancy of its own making.
- `backend/db/apply.mjs` — ordered runner with a checksum ledger, refusing to re-run an
  applied file whose contents changed. Runs psql inside the `db` container, so Docker is the
  only prerequisite. `npm run db:up | db:status | db:migrate | db:seed | db:reset`.
- API gained `backend/api/src/db/` (pool + parcel repository) and `GET /parcels`,
  `GET /parcels/:id`. `/ready` now reaches the database and returns 503 when it cannot.
- `DATABASE_URL` is **required**: the service exits at boot rather than serving 500s.
- `scripts/check-invariants.mjs` gained **Invariant 4** — every table created in a migration
  must be named in `*_rls.sql` — and Invariant 3 now also bans a connection string or the
  Postgres driver from the app.
- **fastify 5.6.1 → 5.12.5.** `npm audit` reported five advisories against 5.6.1, one of them
  spoofing `request.protocol`/`request.host` via `X-Forwarded-*`, which matters because this
  service runs with `trustProxy: true`. Now reports 0 vulnerabilities.

**Verified:** all eight migrations apply from empty; `db:reset` rebuilds the schema and
re-seeds; re-running `db:migrate` is a no-op. `GET /parcels?district=Wakiso` and
`?bbox=32.5,0.3,32.7,0.45` return seeded parcels with GeoJSON boundaries; `EXPLAIN` confirms
`parcels_boundary_gix` is used for bbox queries. Eight constraint tests all rejected: invalid
polygon, negative price, a result with no `is_demo_data`, buyer equal to seller, two live
escrows on one listing, and `UPDATE`/`DELETE` on `audit_log`. As `anon` and as
`authenticated`: permission denied on every table; with `SELECT` granted back, RLS still
returns **zero rows**. The API refuses to boot with no `DATABASE_URL`. `npm run check` clean.

**Caught by the reset, not by the build:** PostGIS installs into the `extensions` schema after
a rebuild — exactly where Supabase puts it — and the API could not resolve a single spatial
function. The pool now pins `search_path=public,extensions` on every connection. Applying to
the hosted project first would have found this there instead.

**`/review` findings — resolved the same session, except the apply itself:**
1. ~~`apply.mjs --url` puts the password in `ps`~~ — `--url` is now **refused**. `--remote`
   reads `TARGET_DATABASE_URL` from `backend/.env` or the environment and hands it to psql as
   a `\connect` line **over stdin**, so no password is ever an argument to any process.
   `seed --remote` demands `SEED_REMOTE=yes`; `reset` refuses `--remote` outright.
2. ~~Two migration ledgers~~ — decided: **`backend/db/apply.mjs` is the only thing that applies
   migrations, to any environment.** Not the Supabase CLI, not the MCP, not the SQL editor.
   One ledger, `public.schema_migrations`. Read the hosted project with anything; apply with this.
3. ~~`escrow_transactions.funded_at` unconstrained~~ — `0009` adds
   `escrow_funded_at_present`: `funded`, `conditions_met` and `released` all require a
   `funded_at`. `disputed` and `refunded` deliberately do not — a dispute can start before
   funding, and an escrow abandoned at `opened` is refunded with no money ever having moved.
4. ~~The hosted apply~~ — ✅ **done and verified.** All nine migrations are applied to
   `jytkcgqoczuijgrazhjk`; the ledger holds nine rows whose checksums match the local ones
   exactly. On the hosted project: PostGIS in `extensions`, 7 enum types, RLS enabled and
   forced on all seven tables, **zero policies, zero grants to `anon`/`authenticated`**, and
   `set role anon; select from parcels` returns **permission denied**. The `profiles_id_fkey`
   to `auth.users` is present there and correctly absent locally — the one real environment
   difference, behaving as the guarded block intended. Security advisors report only INFO
   `rls_enabled_no_policy`, which is the design.

   **The runner reported failure after succeeding.** The batched apply ran server-side to
   completion and wrote all nine ledger rows; the client then waited for a reply that never
   came and was killed at the 120s timeout. A timeout from this runner is not evidence that
   nothing applied — read the ledger before concluding anything.

   Two things were fixed in the attempt:
   - **One connection for the whole apply**, not one per migration. Each psql invocation is a
     fresh connection, DNS lookup and pooler session; a dozen of them against a remote host is
     how the first run hit a DNS failure and then a hang. Each file still runs in its own
     transaction, so a partial run stays resumable.
   - **The ledger is no longer readable by `anon`.** Supabase's advisor caught that
     `public.schema_migrations` is created by the runner rather than by a migration, so `0008`
     never saw it — a complete map of the schema's history, exposed to anyone with the anon
     key. The runner now enables RLS and revokes both roles as it creates the table.

   Also learned: **a wrong password on the Supabase pooler hangs rather than failing.** The
   connection is accepted and then never answered, and libpq's `connect_timeout` does not
   cover it. The runner now aborts after 120s and says so.
5. **Still open by design: `GET /parcels` is unauthenticated** until Step 5 puts JWT
   verification in front of it. Do not expose the API beyond localhost until then.

**Also in 0009:** `alter database ... set search_path to "$user", public, extensions`. The
pool pins the same path per connection, but anything else that connects — psql, a GUI client,
a pooler that drops startup options — would not have it, and without `extensions` on the path
no PostGIS function resolves at all. Supabase's **transaction pooler (port 6543) drops
connection options**, which is why the database-level setting is the real fix and `pool.ts`
detects that port and omits the option.

### Step 5 — Auth + identity
Supabase phone OTP for Ugandan numbers in the app; the backend verifies the resulting JWT on
every request. NIN capture, ID photo uploaded via a backend-issued signed URL, `identity`
adapter returning a mock registry match. Status shows "pending verification" — never implies
a real check.
**Done when:** a real Ugandan number receives an OTP and signs in; the API rejects a request
with a missing, expired or forged token; the session survives an app restart.

### Step 6 — Listings + map
Browse, filter by district, detail screen, parcel polygon on satellite imagery. Every listing
carries an explicit verification badge. All data via the backend API.
**Done when:** polygons draw at correct coordinates; empty and error states both render.

### Step 7 — Verification flow
Title/parcel number → backend → `registry` adapter (mock) → result card with ownership,
transfer history, boundary status, encumbrances. Persistent demo-data disclosure.
**Done when:** good title returns valid, bad title returns flagged with a warning, network
failure offers retry rather than crashing or silently passing.

### Step 8 — Escrow (sandbox only)
Server-authoritative state machine `opened → funded → conditions_met → released`, plus
`disputed` and `refunded`. Mobile-money sandbox behind the `payments` adapter. Every
transition appends to `audit_log`. The app renders state; it never computes it.
**Done when:** the full path walks in sandbox; illegal transitions are rejected by the API
even when requested directly; audit rows exist for every transition.

### Step 9 — Ship
Backend image published and deployed to a real cluster; EAS dev build → internal distribution
→ Play Internal Testing / TestFlight. Sentry wired on both sides, env hygiene checked, store
copy written.
**Done when:** the build installs on a physical Android device, points at the deployed API,
and completes the flow end to end.

---

## 5. Dependencies with lead time

Start these early — they block later steps and are not instant.

| Need | Blocks | Action |
|---|---|---|
| ~~Docker Desktop Kubernetes~~ | Step 3 | ✅ enabled. Context `docker-desktop`, kind-type, 1 node, v1.36.1 |
| ~~Supabase project~~ | Step 4 | ✅ resolved — `jytkcgqoczuijgrazhjk` ("EbbaLands", eu-west-1, PG 17.6.1) is live and is the ref recorded here. Schema not yet applied to it. |
| Google Maps API key | Step 6 | Create Google Cloud project, enable Maps SDK |
| Mobile-money sandbox | Step 8 | Register now — approval takes time |
| Container registry | Step 9 | Somewhere to push the API image |
| Play Console + Apple Developer | Step 9 | ~$25 one-off + $99/yr |

---

## 6. Out of scope

Registry replacement · blockchain title ledger · statutory survey work · real money movement ·
ML prediction · web app · admin console · offline-first sync · multi-country.

Reasons for each are in [AGENTS.md §7](AGENTS.md). They are excluded on merit, not difficulty.

---

## 7. Open questions

1. ~~AGENTS.md contradicts this plan~~ — ✅ resolved in Step 3. §3 carries the `backend/`
   tree, §4.3 points the adapter boundary at `backend/api/src/adapters/`, and a new §4.6
   ("the server decides, the app displays") makes the escrow and verification rules
   server-authoritative. `scripts/check-invariants.mjs` enforces all of it.
2. ~~**Supabase project identity.**~~ ✅ resolved 2026-09-20. The account holds exactly one
   project: `jytkcgqoczuijgrazhjk`, "EbbaLands", eu-west-1, Postgres 17.6.1, healthy — the ref
   this plan already recorded. Last session's `llxxcnrdrkshqddxkyxr` was an artifact of a
   differently scoped MCP connection, not a second project.

   **Still open in its place:** the Step 4 schema has not been applied to it. The apply was
   refused by the session's permission classifier as a write to a shared resource, and was not
   worked around. It needs either an explicit go-ahead or a run by hand.
3. Google Maps API key — existing Google Cloud project, or scaffold with a placeholder?
4. Mobile-money sandbox — start registration now?
5. Luganda from the start, or English-only for the prototype? Cheap now, expensive later.
