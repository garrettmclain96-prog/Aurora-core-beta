# Aurora Core OS (v2.0)

Aurora Core OS is a hybrid cognitive engine that manages three domains of a
connected environment — **Energy**, **Biometrics**, **Environment** — and
exposes a single **System Score (0–100)**, real-time state, prognostic
insights, and recommended actions.

This repository is a production-ready monorepo, ready to deploy:

```
aurora-core-os/
├── apps/
│   ├── api/         Node + TypeScript + Express + Prisma + Redis + WS
│   └── web/         Next.js 14 (Aurora Console + /chat) on Vercel
├── packages/
│   ├── sdk-node/    Official TypeScript SDK
│   └── sdk-python/  Official Python SDK
├── docs/            Getting started, concepts, API + SDK reference
├── docker-compose.yml
└── .env.example
```

## Quickstart

```bash
# 1. Boot Postgres + Redis
docker compose up -d

# 2. API
cd apps/api
cp .env.example .env
pnpm install
pnpm prisma migrate dev
pnpm seed
pnpm dev          # → http://localhost:4000

# 3. Web
cd ../web
cp .env.example .env.local
pnpm install
pnpm dev          # → http://localhost:3000
```

Read **[docs/getting-started.md](docs/getting-started.md)** to send your first
event in under 15 minutes.

## What you get

- Versioned REST API (`/v1/*`) with API-key auth, rate limiting, audit logs.
- WebSocket channel (`/v1/stream`) for state, alerts, actions, and score updates.
- Decision engine with explicit, tunable heuristics for energy / health / habitat.
- Three operating modes: **Energy Guardian**, **Health Sentinel**, **Habitat Optimizer**.
- Aurora Console: System Score gauge, live panels, mode selector, onboarding.
- `/chat` page with a natural-language → command mapping layer.
- Node + Python SDKs with `sendEvent`, `getState`, `getInsights`, `subscribe`.
- Structured JSON logs, Prometheus-friendly metrics, `/health` endpoint.

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the full design.
