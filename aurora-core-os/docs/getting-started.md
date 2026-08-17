# Getting Started — Plug Aurora in 15 minutes

## 1. Boot the stack

```bash
docker compose up -d                # Postgres + Redis
cd apps/api && pnpm install
pnpm prisma migrate dev
pnpm seed                            # prints your installation id + API key
pnpm dev                             # http://localhost:4000
```

The seed step prints something like:

```
Installation: clxyz...
API key (store this — shown once): ak_5fd9c0e3...
```

Save that key. It is hashed in the DB; you cannot recover it.

## 2. Send your first event

cURL:
```bash
curl -X POST http://localhost:4000/v1/events \
  -H "Authorization: Bearer ak_..." \
  -H "Content-Type: application/json" \
  -d '{"domain":"ENERGY","kind":"solar_w","value":1240}'
```

Node:
```ts
import { AuroraClient } from "@aurora/sdk";
const aurora = new AuroraClient({ baseUrl: "http://localhost:4000", apiKey: "ak_..." });
await aurora.sendEvent({ domain: "ENERGY", kind: "solar_w", value: 1240 });
```

Python:
```python
from aurora import AuroraClient
aurora = AuroraClient("http://localhost:4000", "ak_...")
aurora.send_event({"domain": "ENERGY", "kind": "solar_w", "value": 1240})
```

## 3. Read your first insight

```bash
curl -H "Authorization: Bearer ak_..." http://localhost:4000/v1/insights
```

Response (truncated):
```json
{ "current": { "score": 87, "breakdown": { "energy": 92, "biometric": 80, "environment": 90, "mode": "habitat_optimizer" }, "signals": [], "actions": [] } }
```

## 4. Wire one device action

```bash
# Send a reading that triggers Aurora to act:
curl -X POST http://localhost:4000/v1/events \
  -H "Authorization: Bearer ak_..." -H "Content-Type: application/json" \
  -d '{"domain":"ENVIRONMENT","kind":"co2_ppm","value":1700}'

# Subscribe to actions:
wscat -c "ws://localhost:4000/v1/stream?api_key=ak_..."
# → { "type": "action", "action": { "command": "set_ventilation", "args": { "level": "high" }, ... } }
```

That's the loop: **events → state → insights → actions**.
