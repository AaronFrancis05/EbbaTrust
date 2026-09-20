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
│   │   ├── db/          Postgres/Supabase access                   (Step 4)
│   │   └── auth/        JWT verification                           (Step 5)
│   └── Dockerfile
├── db/migrations/       SQL + PostGIS + RLS                        (Step 4)
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

## Endpoints

| Route | Purpose |
|---|---|
| `GET /health` | Liveness. Restarting the pod is the right response to this failing. |
| `GET /ready` | Readiness. Only removes the pod from the Service. |

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

The **service-role key bypasses RLS** and belongs to this service alone — never the mobile
bundle, never a ConfigMap, never a commit. In the cluster it comes from the `api-secrets`
Secret, whose shape (and only its shape) is committed as `k8s/secret.example.yaml`.
