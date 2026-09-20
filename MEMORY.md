# Memory — EbbaTrust

Last updated: 2026-09-20

> Written and read by the `/remember` skill. No secrets, ever — redact as `[REDACTED_API_KEY]`.

---

## What was built

**Session 2 (2026-09-20) — Steps 2 and 3 complete. See "Session 2" below.**

**Session 1 (2026-09-20) — Steps 0 and 1 complete.**

### Step 0 — Governance
`AGENTS.md` (operating contract: persona, boundaries, rules, tokens, out-of-scope, pinned
versions), `CLAUDE.md` (session protocol pointing to AGENTS.md), `PLAN.md` (9-step build
sequence), `MEMORY.md`, `ui-registry.md` (seeded with the token baseline), `README.md`.

### Step 1 — Scaffold
- `git init` (branch `main`), `.gitignore` covering `.env`, `node_modules`, native dirs.
- Expo **SDK 57.0.24** + expo-router 57 + React 19.2.3 + RN 0.86.3.
- **NativeWind 4.2.7 + Tailwind 3.4.19**; `global.css`, `metro.config.js` (`withNativeWind`),
  `babel.config.js` (`jsxImportSource: nativewind`).
- Design tokens in `tailwind.config.js`, mirrored in `src/lib/theme/tokens.ts`
  (incl. `statusTokens` and `MIN_TAP_TARGET`).
- `tsconfig.json` strict + `noUncheckedIndexedAccess` + `@/*` → `./src/*`.
- `app/_layout.tsx` (QueryClientProvider, SafeAreaProvider, GestureHandlerRootView, Stack),
  `app/index.tsx` (throwaway scaffold-verification screen — **delete at Step 2**).
- `src/lib/query/client.ts` — retry/backoff tuned for slow networks; **mutations never
  auto-retry** (a retried escrow call could double-charge).
- ESLint 9 flat config + `eslint-config-expo` + import resolver; route-boundary rule blocking
  `supabase` imports inside `app/`.
- **`scripts/check-invariants.mjs`** — enforces the adapter boundary and token parity.
  Verified it catches real violations and correctly ignores comment references.
- `npm run check` = typecheck + lint + invariants.
- Full folder structure per AGENTS.md §3.

### Integrations configured
- `.mcp.json` — Supabase MCP (`project_ref=jytkcgqoczuijgrazhjk`, 7 features) and PostHog MCP
  (`https://mcp.posthog.com/mcp`).
- `.agents/skills/` — `supabase` and `supabase-postgres-best-practices` (committed);
  `.claude/skills/` symlinks are machine-specific and gitignored.

## Decisions made

| Decision | Choice | Reasoning |
|---|---|---|
| Product name | **EbbaTrust** | Bundle `ug.ebbatrust.app` |
| Styling | NativeWind v4 | `/imprint` reads Tailwind classes verbatim, unmodified |
| Backend | Supabase | PostGIS decisive for parcel boundaries; plus RLS, phone OTP, Storage |
| Maps | react-native-maps + Google Maps | Best Uganda satellite coverage. **Forces a dev build from Step 5 — Expo Go stops working.** |
| **Adapter boundary** | All external services behind interfaces + mocks | The load-bearing decision. No MLHUD/NIRA/MoMo agreements exist. Makes the product buildable now; go-live is a one-function change. Now machine-enforced. |
| Invariants as code | `scripts/check-invariants.mjs` | Written rules drift. The two that matter most are now build failures. |
| Scaffold approach | Manual, not `create-expo-app` | Directory was non-empty (governance files + `skills/`); the CLI would have refused or prompted. |

## Problems solved

**Do not re-attempt these — they fail:**

1. **The video cannot be read.** `Vok_nReMFaU` ("AI Can Build Your App. It Can't Engineer It.
   (9 Skills)") — YouTube blocks transcript extraction; direct fetch and proxy both failed.
   `skills/` has **5 of 9**. Built on the five present rather than inventing four.
2. **TypeScript 7 breaks ESLint.** `ts-api-utils` reads TS 5 internals the Go-based TS 7 does
   not expose → `TypeError: Cannot read properties of undefined (reading 'Intrinsic')`.
   **Pinned `typescript@5.9.3`.** Note `npx expo install typescript` resolves to 7.x, so the
   pin must be reapplied if anyone runs it.
3. **react-dom conflict blocked all installs.** A transitive `react-dom@19.3.0` (via
   `@expo/router-server`) demanded `react@^19.3.0` while the SDK pins `react@19.2.3`.
   Fixed by `npx expo install react-dom` → 19.2.3. `--legacy-peer-deps` was avoided.
4. **`npm install --silent` hides ERESOLVE failures entirely** — packages silently did not
   install while the command appeared to succeed. Never use `--silent` for installs here.
5. **Tailwind 4 is wrong for NativeWind 4.** The peer range `>3.3.0` permits it, but v4 is
   built against Tailwind 3's JS config. Pinned `tailwindcss@3.4.19`.
6. **`expo-status-bar` dropped `backgroundColor`** in SDK 57 (Android edge-to-edge).
7. **`.css` side-effect imports need `declare module '*.css'`** in `nativewind-env.d.ts`.
8. **Interactive TUIs cannot run here.** Both `claude /mcp` and `npx @posthog/wizard mcp add`
   need raw-mode stdin (Ink) and crash. MCP config was written directly to `.mcp.json` instead.

## Session 2 (2026-09-20) — Steps 2 and 3

### Step 2 — UI primitives
Eight primitives in `src/components/ui/`: `Button`, `Card`, `Input`, `Badge`, `StatusPill`,
`EmptyState`, `Skeleton` (+`SkeletonText`, `SkeletonCard`), `Disclosure`, plus `src/lib/cn.ts`.
`app/index.tsx` is now a primitive gallery; the Step 1 scaffold screen is gone.
- **Icons: `lucide-react-native` + `react-native-svg`** — lucide's names already match
  `statusTokens.icon`, so there is no rename map and no second home for status semantics.
- **Variants: typed `Record<Variant, string>` class maps.** No cva/tailwind-variants, so
  `/imprint` reads literal class strings.
- **Animation: React Native `Animated`, not Reanimated.** `react-native-reanimated@4.5.1` is
  in `package.json` but its required peer `react-native-worklets` is **not installed** — using
  `Animated` sidestepped that. Revisit if Reanimated is ever genuinely needed.
- `useRef(new Animated.Value(...)).current` is rejected by the `react-hooks/refs` lint rule
  ("Cannot access refs during render"). Use a lazy `useState(() => new Animated.Value(...))`.
- **Added the `danger-900` token (`#7A2222`)** to `tailwind.config.js` and `tokens.ts`.
  `active:bg-danger-600` was a no-op, so the destructive button had no press feedback.
- All eight imprinted in `ui-registry.md`; audit found no hardcoded hex or arbitrary values.

### Step 3 — Backend service skeleton
`backend/` now exists and runs. Fastify 5.6.1 + TS 5.9.3, ESM/NodeNext, own tsconfig.
- `backend/api/src/`: `server.ts`, `config.ts`, `routes/health.ts`, `adapters/`, plus empty
  `domain/`, `db/`, `auth/` for Steps 4-8.
- **Adapters moved server-side** to `backend/api/src/adapters/{registry,identity,payments}/`,
  each with `index.ts` (interface + factory), `mock.ts` (deterministic) and a provider stub
  that **throws `NotImplementedError`** — never an optimistic default.
- Multi-stage `Dockerfile`: builds with dev deps, ships dist + prod deps only, `dumb-init` as
  PID 1 so SIGTERM reaches Node, runs as `uid=1000(node)`, read-only root filesystem in k8s.
- `backend/k8s/deployment.yaml` = namespace + configmap + deployment + service.
  **Separate `/health` (liveness) and `/ready` (readiness) probes** — sharing one endpoint
  turns a dependency blip into a restart loop.
- `scripts/check-invariants.mjs` repointed at the new adapter dir, now scans `backend/api/src`
  too, and gained **Invariant 3 (client/server split)**: no `.from('...')` and no
  `service_role`/`SERVICE_ROLE` anywhere in `app/` or `src/`.
- Root `npm run check` now also runs `typecheck:backend`. Root `tsconfig.json` excludes
  `backend`; `eslint.config.js` ignores `backend/**` (separate project, no React).
- Old empty `supabase/` directory removed — migrations live in `backend/db/migrations/`.
- `src/services/api/client.ts` is the app's only data path. Handles the Android-emulator
  `10.0.2.2` host, a 15s timeout, and never turns a failure into an empty result.

### Governance updated to match
`AGENTS.md` §3 (backend tree), §4.1 (app uses `src/services/api/`, Supabase for auth only),
§4.3 (adapter boundary → `backend/api/src/adapters/`), **new §4.6 "the server decides, the app
displays"**, §5.2 (service-role key lives only in `backend/`), §6 (`danger-900`), §9 (backend
and kubectl commands). `PLAN.md` rewritten: new §3.1 topology, §3.2 layout, steps renumbered
(old 4-8 → 5-9).

### Verified this session
- `npm run check` clean: app typecheck + backend typecheck + lint + 3 invariants.
- Invariants tested against a deliberate violation file — all three fired, exit 1.
- `expo export --platform android` bundles (6.1MB).
- `docker compose -f backend/compose.yaml up --build -d` → `(healthy)`, `/health` returns
  `{"status":"ok","adapterMode":"mock","demoData":true}`, 404 shape correct, runs as non-root.
- `kubectl apply -f backend/k8s/deployment.yaml` → pod `1/1 Running`, 0 restarts, answers over
  a port-forward. Docker Desktop's **kind-type** cluster reads the locally built image, so
  `imagePullPolicy: IfNotPresent` works with no registry and no `kind load`.

### Environment facts
- Docker Desktop v4.91, Docker 29.7.2, Compose v5.5.0. **Kubernetes enabled** — context
  `docker-desktop`, kind-type, 1 node, v1.36.1. kubectl v1.36.1. No helm, no standalone kind.
- Both the compose container and the k8s deployment were left **running** at session end.

## Current state

**Working and verified:**
- `npm run check` passes clean — typecheck, lint, invariants.
- `npx expo export --platform android` bundles successfully; all six token hex values confirmed
  present in the output, NativeWind runtime (`cssInterop`) confirmed in the bundle.

**Still not verified:** the app has **never been rendered on a device or simulator**.
Bundling is not the same as running, and that is now true of eight primitives rather than one
throwaway screen. It remains the oldest unverified thing in the project.

**Not done:** no database schema, no auth, no maps, no domain logic (`backend/api/src/domain/`
is empty), no `/review` run on Steps 2 or 3.

## Next session starts with

1. **`npx expo start`** and open the primitive gallery on a device. Check the status colours
   and tap targets in daylight — that is the condition they were designed for.
2. **Resolve the Supabase project.** `PLAN.md` recorded `jytkcgqoczuijgrazhjk`; the account
   reachable via the claude.ai Supabase connector holds only `llxxcnrdrkshqddxkyxr`
   ("AaronFrancis05's Project", eu-west-1, Postgres 17.6.1). Step 4 applies migrations, so
   this must be settled first.
3. **Step 4 — Data model.** PostGIS schema in `backend/db/migrations/`, RLS deny-by-default
   on every table as the second wall behind the API. Run `/architect` first.
4. **`/review` Steps 2 and 3** — neither has been reviewed.

## Open questions

1. **Google Maps API key** — existing Google Cloud project, or placeholder + setup docs?
   (Blocks Step 6.)
2. **MTN/Airtel sandbox** — begin registration? Has real lead time. (Blocks Step 8.)
3. **Luganda at launch or English-only?** Affects the i18n scaffold; cheap now, expensive later.
4. **The missing four skills** — will the developer supply them?
5. **PostHog** — analytics was not in the original plan. Confirm intent, and note that
   analytics in this app touches sensitive data: NINs, title numbers and phone numbers must
   never be sent as event properties (AGENTS.md §5.2).
