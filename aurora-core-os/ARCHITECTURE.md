# Aurora Core OS — Architecture

## High-level diagram

```
              ┌──────────────────────────────────────────────┐
              │              External world                  │
              │  Sensors · Wearables · TurnBot · Smart home  │
              └──────────────┬───────────────────┬───────────┘
                             │ HTTPS (REST)      │ WS / SSE
                             ▼                   ▼
        ┌──────────────────────────────────────────────────┐
        │                Aurora API (Express)              │
        │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
        │  │  Auth /  │  │ Ingest / │  │  Realtime hub  │  │
        │  │ rate-lim │  │  events  │  │  (ws + redis)  │  │
        │  └────┬─────┘  └────┬─────┘  └────────┬───────┘  │
        │       │             │                 │          │
        │       ▼             ▼                 ▼          │
        │  ┌─────────────────────────────────────────────┐ │
        │  │           Aurora Decision Engine            │ │
        │  │   ingest → state → score → insights →       │ │
        │  │              actions → audit                │ │
        │  └────┬───────────────────┬────────────────────┘ │
        │       │                   │                      │
        │       ▼                   ▼                      │
        │  ┌─────────┐         ┌─────────┐                 │
        │  │Postgres │         │  Redis  │                 │
        │  │(Prisma) │         │ pub/sub │                 │
        │  └─────────┘         └─────────┘                 │
        └──────────────────┬───────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Aurora Console (Web)  │
              │  Next.js · /, /chat     │
              └─────────────────────────┘
```

## Components

| Layer        | Tech                                  | Responsibility                                      |
|--------------|---------------------------------------|-----------------------------------------------------|
| API          | Node 20, TypeScript, Express, Zod     | REST `/v1/*`, auth, rate limit, validation          |
| Engine       | Pure TS module                        | Score, insights, actions, modes                     |
| Realtime     | `ws` + Redis pub/sub                  | Fan-out state/alerts to many clients/installations  |
| Persistence  | Postgres (Prisma)                     | Users, keys, installations, events, actions, audits |
| Cache        | Redis                                 | Hot state per installation, rate-limit counters     |
| Web          | Next.js 14 (App Router), Tailwind     | Console + `/chat` + onboarding                      |
| SDKs         | TS (`@aurora/sdk`) and Python         | Public client surface                               |
| Infra        | Railway/Fly/Render + Vercel + Neon    | Standard managed stack                              |

## Request lifecycle (event ingest)

1. SDK calls `POST /v1/events` with `Authorization: Bearer <api-key>`.
2. `apiKeyAuth` middleware resolves the key → `Installation`.
3. `rateLimit` middleware checks Redis token bucket.
4. Handler validates payload with Zod, persists `Event`.
5. `engine.ingest()` updates the in-memory state for that installation,
   recomputes `SystemScore`, emits new `Insights` and (optionally) `Actions`.
6. New state is cached in Redis and published on
   `aurora:installation:<id>` channel.
7. WS hub forwards messages to all subscribers of that installation.
8. Audit log persisted for any `Action` issued to a device.

## Data model (Prisma)

See `apps/api/prisma/schema.prisma` for the source of truth. Tables:

- `User` — owner of installations
- `ApiKey` — hashed key, scopes, last-used, revoked-at
- `Installation` — a single Aurora instance (a home, vehicle, lab…)
- `Sensor` — energy / biometric / environment sensor metadata
- `Device` — controllable device (TurnBot, light, valve, hvac…)
- `Event` — incoming reading
- `Action` — command Aurora issued to a device
- `Insight` — score snapshot + breakdown + recommendations
- `ModeConfig` — per-installation active mode + thresholds
- `AuditLog` — immutable record of sensitive operations
