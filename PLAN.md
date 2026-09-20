# PLAN.md — EbbaTrust System Plan

The build sequence for the EbbaTrust mobile prototype.
Operating rules live in [AGENTS.md](AGENTS.md). Live progress lives in [MEMORY.md](MEMORY.md).

**Status:** Steps 0-3 complete. Step 4 next.
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

### Step 4 — Data model ← NEXT
PostGIS schema in `backend/db/migrations/`: `profiles`, `parcels` (`geometry(Polygon, 4326)`),
`listings`, `verification_requests`, `verification_results`, `escrow_transactions`,
`audit_log`. RLS on every table, deny-by-default, as the second wall behind the API.
Seeded with real Ugandan districts and plausible polygons.
**Done when:** migrations apply; a spatial query through the API returns seeded parcels; an
anonymous direct query returns zero rows.

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
| Supabase project | Step 4 | ⚠ See open question 2 — the recorded ref and the reachable account disagree |
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
2. **Supabase project identity.** This plan previously recorded `jytkcgqoczuijgrazhjk`. The
   Supabase account reachable from this machine contains exactly one project,
   `llxxcnrdrkshqddxkyxr` ("AaronFrancis05's Project", eu-west-1, Postgres 17.6.1). Resolve
   before Step 4 applies a single migration.
3. Google Maps API key — existing Google Cloud project, or scaffold with a placeholder?
4. Mobile-money sandbox — start registration now?
5. Luganda from the start, or English-only for the prototype? Cheap now, expensive later.
