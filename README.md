<div align="center">

# AURORA CORE OS
### v2.0 · McLain Systems

**Hybrid cognitive engine for energy, biometrics, and environment.**  
REST API · WebSocket · Webhooks · AI Chat · TypeScript + Python SDKs

[![Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/garrettmclain96-prog/Aurora-core-beta)

[Live Demo](https://aurora-core-beta.vercel.app) · [API Docs](aurora-core-os/docs/api-reference.md) · [Dev Portal](https://aurora-core-beta.vercel.app/dev)

</div>

---

## Running this repo

This repo root is the **deployed Vite app** (`src/`) plus its **Vercel serverless
functions** (`api/`) — the thing that actually runs at your Vercel URL.
`aurora-core-os/` alongside it is a separate, standalone Express/Prisma/Redis
backend project with its own setup (see its own README); the two aren't wired
together.

**Setup:**
```bash
npm install
cp .env.example .env.local   # fill in real values — see below
```

Plain `vite` doesn't serve the `/api/*` functions that auth, chat, JARVIS
voice, and relay control all depend on. Use the Vercel CLI so the frontend
and API routes run together locally:
```bash
npm i -g vercel   # once
vercel dev
```
(`npm run dev` still works for pure frontend iteration, but sign-in, chat,
and relay control won't function without `vercel dev` or a real deployment.)

**Required env vars** (`.env.example` has the full list with comments):
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — auth. Get both from your
  [Clerk Dashboard](https://clerk.com) → API Keys. The publishable key is
  accepted as `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, or
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, so it works whichever form you
  copied. It's resolved at build time (see `vite.config.ts`), so changing
  it requires a redeploy. The secret key is never exposed to the browser.
Social sign-in ("Continue with Google") is rendered from `SOCIAL_BUTTONS` in
`src/components/AuthScreen.tsx`. Clerk exposes no API for a custom sign-in UI
to discover which SSO connections an instance has enabled, so that list is the
source of truth — each provider in it **must also be enabled** under
User & Authentication → SSO Connections in the Clerk Dashboard, or the button
reports that it isn't. OAuth returns to `/sso-callback`, handled in `App.tsx`.

- `GOD_USER_ID` (recommended) or `GOD_EMAIL` — which account is granted the
  top `god` role automatically on first sign-in; everyone else starts as
  `viewer`, and only a `god` can promote/demote accounts to `admin`
  (Settings → Users tab). Prefer `GOD_USER_ID` (a Clerk `user_...` id):
  it's immutable, so it survives an email change and binds correctly no
  matter which address you signed up with. Both are checked server-side
  against the Clerk user record, never from client input; defaults live in
  `api/_clerk.ts`.
- `ANTHROPIC_API_KEY` / `GROQ_API_KEY` — AI chat (Anthropic first, Groq as
  a free fallback).
- `OPENAI_API_KEY` — JARVIS voice mode (Whisper + GPT-4o-mini + TTS).
- `INGEST_SECRET` — shared secret for `POST /api/ingest` (ESP32 telemetry).
  Without it, ingest POST fails closed (503) rather than accepting
  unauthenticated writes.

**Relay control is a physical safety boundary, not a demo toggle.**
`/api/relay` switches real hardware — including the generator and propane
relays on the RV build this targets. `POST /api/relay` requires a signed-in
`god` or `admin` Clerk session; `GET` (read-only state) is open. The
Dashboard's relay widget and the TurnBot panel both lock their controls in
the UI for any other role.

---

## What is Aurora?

Aurora Core OS is a real-time cognitive engine that manages three domains of a connected environment:

| Domain | Sensors | Score contribution |
|---|---|---|
| **Energy** | Solar, load, battery SoC, grid tariff | Demand/supply balance, self-consumption, cost |
| **Biometrics** | HR, HRV, stress (0–100) | Strain detection — non-medical, conservative |
| **Environment** | Temp, humidity, CO₂ ppm, PM2.5 | Comfort and air-quality safety |

It computes a **System Score (0–100)**, generates human-readable **signals**, and issues **device actions** — automatically, in real time, with every incoming sensor reading.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  External devices / sensors / wearables                     │
│  (Enphase, Tesla, Ecobee, Home Assistant, MQTT, Shelly...)  │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /v1/events
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Aurora Core Engine (Node/TypeScript)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Ingest → State (Redis) → Score + Signals → Actions  │   │
│  │  + Trend detection  + Predictive score               │   │
│  └──────────────────────────────────────────────────────┘   │
│  REST API  ·  WebSocket stream  ·  Webhooks                 │
└──────────┬──────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
    ▼                                     ▼
PostgreSQL (events, insights,         Redis (live state,
 actions, audit, webhooks)            pub/sub, rate limit)
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Frontends                                               │
│  Aurora Console (Next.js) · Aurora Vite App (deployed)  │
└──────────────────────────────────────────────────────────┘
```

---

## Quick Start (15 minutes)

```bash
git clone https://github.com/garrettmclain96-prog/Aurora-core-beta.git
cd Aurora-core-beta/aurora-core-os
docker compose up -d          # Postgres + Redis
cd apps/api
pnpm install
pnpm prisma migrate dev
pnpm seed                     # prints installation ID + API key
pnpm dev                      # → http://localhost:4000
```

Send your first event:
```bash
curl -X POST http://localhost:4000/v1/events \
  -H "Authorization: Bearer ak_..." \
  -H "Content-Type: application/json" \
  -d '{"domain":"ENERGY","kind":"solar_w","value":1240}'
# → {"accepted":1,"results":[{"score":87,"trend":"stable"}]}
```

No sensors? Inject demo data instantly:
```bash
curl -X POST http://localhost:4000/v1/simulate \
  -H "Authorization: Bearer ak_..." \
  -d '{"scenario":"stress"}'
```

---

## SDKs

**Node/TypeScript**
```ts
import { AuroraClient } from "@aurora/sdk";
const aurora = new AuroraClient({ baseUrl: "http://localhost:4000", apiKey: "ak_..." });

await aurora.sendEvent({ domain: "ENERGY", kind: "solar_w", value: 1240 });
const { current } = await aurora.getInsights();
console.log(`Score: ${current.score}/100 (${current.trend})`);

const off = aurora.subscribe(msg => {
  if (msg.type === "action") console.log("Aurora says:", msg.action.command);
});
```

**Python**
```python
from aurora import AuroraClient
aurora = AuroraClient(api_key="ak_...", base_url="http://localhost:4000")

aurora.send_event({"domain": "ENERGY", "kind": "solar_w", "value": 1240})
data = aurora.get_insights()
print(f"Score: {data['current']['score']}/100")
```

---

## API Highlights

| Endpoint | Description |
|---|---|
| `POST /v1/events` | Send sensor readings (single or batch) |
| `GET /v1/state` | Current live state |
| `GET /v1/insights` | Score + signals + trend + prediction |
| `GET /v1/history` | Event time-series query |
| `POST /v1/devices/:id/command` | Issue device command |
| `POST /v1/config/mode` | Switch energy/health/habitat mode |
| `POST /v1/chat` | AI natural language query (Claude-powered) |
| `POST /v1/webhooks` | Register webhook endpoint |
| `POST /v1/simulate` | Inject demo scenario |
| `GET /v1/export` | Full installation snapshot |
| `GET /health` | Health check (DB + Redis) |
| `GET /metrics` | Prometheus metrics |

Full docs: [aurora-core-os/docs/api-reference.md](aurora-core-os/docs/api-reference.md)

---

## Modes

| Mode | Energy weight | Bio weight | Env weight |
|---|---|---|---|
| **Energy Guardian** | 60% | 15% | 25% |
| **Health Sentinel** | 15% | 60% | 25% |
| **Habitat Optimizer** | 33% | 33% | 34% |

---

## Repo Structure

```
Aurora-Core/
├── aurora-core-os/           # Full production platform
│   ├── apps/
│   │   ├── api/              # Express + Prisma + Redis backend
│   │   ├── web/              # Next.js console frontend
│   │   └── jarvis/           # Voice AI companion (experimental)
│   ├── packages/
│   │   ├── sdk-node/         # TypeScript SDK
│   │   └── sdk-python/       # Python SDK
│   └── docs/                 # API reference, concepts, security
├── src/                      # Deployed Vite app (aurora-core-beta.vercel.app)
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── DevPortal.tsx     # ← Developer Portal (new)
│   │   └── ...
│   └── components/
└── api/                      # Vercel serverless functions
    └── chat.ts               # Claude AI proxy
```

---

## Contributing

Attribution: Original C++ (TriforceSystem) and Verilog (ARCHANGEL_CORE) by Alexander Colclough (@Lex-Col), used with permission.

Safety note: Bio scoring is intentionally non-medical and conservative. Aurora produces action *records* — your device adapter decides whether to execute them. Never use Aurora as a clinical device.

---

<div align="center">
Built with purpose. · McLain Systems · 2025
</div>
