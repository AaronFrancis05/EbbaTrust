# backend — EbbaTrust API

The service that owns the rules. Domain logic and every external integration run here, not in
the app. See [PLAN.md §3.1](../PLAN.md) for the topology and [AGENTS.md §4](../AGENTS.md) for
the boundaries this code has to hold.

```
backend/
├── api/
│   ├── src/
│   │   ├── routes/      HTTP surface, thin
│   │   ├── domain/      escrow state machine, verification rules  (Steps 7-8)
│   │   ├── adapters/    registry · identity · payments  ◆ critical layer
│   │   ├── db/          Postgres access — pool.ts, parcels.ts
│   │   └── auth/        JWT verification                           (Step 5)
│   └── Dockerfile
├── db/
│   ├── migrations/      numbered SQL — PostGIS schema + deny-all RLS
│   ├── seed.sql         demo data, deliberately NOT in the migration chain
│   └── apply.mjs        the runner
├── k8s/                 deployment, service, configmap, secret shape
└── compose.yaml         local development
```

## Run it

```bash
# From the repo root
npm run backend:up        # docker compose up --build -d
curl http://localhost:8080/health
npm run backend:logs
npm run backend:down
```

```bash
# In Kubernetes (Docker Desktop, context `docker-desktop`)
docker compose -f backend/compose.yaml build       # the cluster reads the local image
kubectl apply -f backend/k8s/deployment.yaml
kubectl -n ebbatrust get pods
kubectl -n ebbatrust port-forward svc/ebbatrust-api 18080:80
curl http://127.0.0.1:18080/health

kubectl delete -f backend/k8s/deployment.yaml      # tear down
```

The manifest uses `imagePullPolicy: IfNotPresent` and the image is never pushed anywhere, so
the cluster uses the locally built `ebbatrust/api:dev`. Rebuild the image and restart the
deployment (`kubectl -n ebbatrust rollout restart deployment/ebbatrust-api`) to pick up changes.

## The database

Postgres with PostGIS. Locally it is the `db` service in `compose.yaml`; the real data layer
is the hosted Supabase project (PLAN.md §3.1). Migrations are proven locally first and applied
to the hosted project afterwards — the local container exists so a mistake costs a `db:reset`
rather than a production incident.

```bash
npm run db:up        # start Postgres+PostGIS alone
npm run db:status    # what is applied, what is pending
npm run db:migrate   # apply pending migrations, once each, in order
npm run db:seed      # demo parcels and listings — never run this against production
npm run db:reset     # drop, re-migrate, re-seed. Local only; it refuses --remote.

npm run db:status:remote    # the same, against TARGET_DATABASE_URL
npm run db:migrate:remote
```

The runner shells into the `db` container to reach `psql`, so Docker is the only prerequisite.
It records every applied file with a checksum and **refuses to run if an already-applied file
has changed** — write a new migration instead of editing an old one, or two environments stop
being the same database without anyone noticing.

### Applying to the hosted project

`--remote` reads **`TARGET_DATABASE_URL` from `backend/.env`** (or the environment, which wins).
It is never passed as a command argument: a password in argv is readable by every user on the
machine via `ps`, and it lands in shell history. `seed` against a remote target refuses unless
`SEED_REMOTE=yes`, and `reset` refuses outright.

```bash
# backend/.env — gitignored, created by a person, never by an agent
TARGET_DATABASE_URL=postgresql://postgres:PASSWORD@db.<project-ref>.supabase.co:5432/postgres

npm run db:status:remote     # should list everything as pending on a fresh project
npm run db:migrate:remote
```

**This runner is the only thing that applies migrations, to any environment.** Not the Supabase
CLI, not the Supabase MCP, not the dashboard SQL editor. Each of those keeps its own ledger in
`supabase_migrations.schema_migrations`, while this one keeps `public.schema_migrations`; two
ledgers means neither can answer whether a database is up to date. Read the hosted project with
whatever you like — apply to it with this.

### Connection strings

Supabase offers three. The difference matters here:

| | Port | Use it when |
|---|---|---|
| **Direct** | 5432 | The default for this service. A long-lived container holding a small pool is exactly what it is for. Needs IPv6 (or the IPv4 add-on). |
| **Session pooler** | 5432 | Same session semantics, reachable over IPv4. Use it if the direct host will not resolve. |
| **Transaction pooler** | 6543 | Serverless only. It hands out a different backend per transaction and **drops connection-time `options`**, so `search_path` cannot be set that way — which is why migration 0009 sets it on the database instead. `pool.ts` detects port 6543 and omits the option. |

Percent-encode the password: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`.

| Table | What it holds |
|---|---|
| `profiles` | one row per signed-in person. NIN is stored as a salted hash plus the last four digits — never in plaintext. |
| `parcels` | land with a boundary, `geometry(Polygon, 4326)`, GiST indexed. `boundary_source` records where the shape came from. |
| `listings` | an offer to sell a parcel. Price is `bigint` UGX minor units. |
| `verification_requests` / `verification_results` | the question and each answer. Results are kept, never overwritten. `is_demo_data` is NOT NULL with no default. |
| `escrow_transactions` | the authoritative escrow state. One live escrow per listing, enforced by a partial unique index. |
| `audit_log` | append-only. `UPDATE` and `DELETE` raise, by trigger. |

**RLS is deny-all with zero policies** (`0008_rls.sql`). The app never queries these tables —
it goes through this API — and this service connects with a role that bypasses RLS. The wall
is there for the day a key leaks: with no policy and no grant, that key opens a closed door.
`npm run check:invariants` fails if a table is ever created without being named in that file.

**PostGIS lives in the `extensions` schema**, matching Supabase. The pool sets
`search_path=public,extensions` on every connection; without it no spatial function resolves.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | Liveness. Restarting the pod is the right response to this failing. |
| `GET /ready` | Readiness. Reaches the database; 503 when it is unreachable. Only removes the pod from the Service. |
| `GET /parcels` | Parcels, filtered by `district` and/or `bbox=west,south,east,north`. `limit` (max 200) and `offset`. Boundaries come back as GeoJSON. |
| `GET /parcels/:id` | One parcel, or 404. |

Both report `adapterMode` and `demoData`. This service cannot run on mocked data without
saying so in every health response — [AGENTS.md §5.3](../AGENTS.md).

## Adapters

`ADAPTER_MODE` (`mock` | `live`) selects the implementation for all three adapters at boot.
That single value is the entire go-live migration described in AGENTS.md §4.3.

| Adapter | Mock behaviour | Live provider |
|---|---|---|
| `registry` | `FRV1234FOLIO5` → valid · `FRV9999FOLIO1` → flagged with a caveat · anything else → not found | stub, throws |
| `identity` | NIN not 14 chars → not found · ends in `9` → mismatch · else → match | stub, throws |
| `payments` | MSISDN ending `0000` → failed · else → succeeded · idempotency honoured | stub, throws |

Mocks are deterministic so a demo is repeatable and a test cannot flake, and every result
carries `isDemoData: true` all the way to the card a buyer reads.

**The live providers throw rather than returning a safe-looking default.** An optimistic
fallback in a registry or payments adapter would surface as a title that raised no concerns,
or an escrow marked funded when no money moved. That is the most damaging bug this product
could ship — [AGENTS.md §4.5](../AGENTS.md).

## Configuration

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored; an agent never creates it.

`DATABASE_URL` is **required** — since Step 4 this service cannot answer a useful request
without a database, so it exits at boot rather than starting and returning 500s. Compose sets
it for you. In the cluster it comes from the `api-secrets` Secret, which means the deployment
now genuinely needs that Secret to become ready even though the `secretRef` is marked optional.

The **service-role key bypasses RLS** and belongs to this service alone — never the mobile
bundle, never a ConfigMap, never a commit. In the cluster it comes from the `api-secrets`
Secret, whose shape (and only its shape) is committed as `k8s/secret.example.yaml`.
