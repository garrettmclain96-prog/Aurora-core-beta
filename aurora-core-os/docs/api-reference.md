# API Reference (v1)

**Base URL**: `https://your-aurora-api`  
**Auth**: `Authorization: Bearer <api-key>` on every request  
**Rate limit**: 120 req/min per key (`X-RateLimit-Limit`, `X-RateLimit-Remaining` headers)

## Error shape

```json
{ "error": { "code": "rate_limited", "message": "Too many requests" } }
```

| HTTP | Code              | When                            |
|------|-------------------|---------------------------------|
| 401  | `missing_key`     | No `Authorization` header       |
| 401  | `invalid_key`     | Unknown / revoked key           |
| 422  | `invalid_payload` | Zod validation failed           |
| 429  | `rate_limited`    | > 120 req/min                   |
| 404  | `not_found`       | Resource not found              |
| 500  | `internal`        | Unhandled server error          |

---

## Events

### `POST /v1/events`

Send one or many atomic sensor readings. Triggers the decision engine immediately.

**Event kinds by domain:**

| Domain        | Kind              | Unit    |
|---------------|-------------------|---------|
| ENERGY        | `load_w`          | Watts   |
| ENERGY        | `solar_w`         | Watts   |
| ENERGY        | `battery_soc`     | %       |
| ENERGY        | `grid_price_cents`| ¢/kWh   |
| BIOMETRIC     | `hr_bpm`          | bpm     |
| BIOMETRIC     | `hrv_ms`          | ms      |
| BIOMETRIC     | `stress`          | 0–100   |
| ENVIRONMENT   | `temp_c`          | °C      |
| ENVIRONMENT   | `humidity`        | %       |
| ENVIRONMENT   | `co2_ppm`         | ppm     |
| ENVIRONMENT   | `pm25`            | µg/m³   |

```json
// Single
{ "domain": "ENERGY", "kind": "solar_w", "value": 1240 }

// Batch
[
  { "domain": "ENERGY",      "kind": "solar_w",  "value": 1240 },
  { "domain": "BIOMETRIC",   "kind": "hr_bpm",   "value": 68   },
  { "domain": "ENVIRONMENT", "kind": "co2_ppm",  "value": 650  }
]
```

**Response `202`:**
```json
{ "accepted": 3, "results": [{ "score": 87, "trend": "stable" }, ...] }
```

---

## State

### `GET /v1/state`

Current in-memory state — latest known value per signal.

```json
{
  "installationId": "clx...",
  "state": {
    "energy":  { "loadW": 820, "solarW": 1240, "batterySoc": 74, "gridPriceCents": 18 },
    "bio":     { "hr": 68, "hrv": 58, "stress": 22 },
    "env":     { "tempC": 22.5, "humidity": 47, "co2Ppm": 650, "pm25": 7 },
    "updatedAt": 1730000000000
  }
}
```

---

## Insights

### `GET /v1/insights`

Current score + signals + last 48 historical records.

```json
{
  "current": {
    "score": 87,
    "trend": "stable",
    "predictedScore": 88,
    "breakdown": { "energy": 92, "biometric": 80, "environment": 90, "mode": "habitat_optimizer" },
    "signals": [
      { "kind": "env.co2_moderate", "severity": "warn", "message": "CO₂ rising: 1050 ppm", "recommendation": "Increase air exchange rate" }
    ],
    "actions": []
  },
  "history": [
    { "id": "...", "score": 86, "breakdown": { ... }, "ts": "2025-06-01T14:00:00Z" }
  ]
}
```

---

## History

### `GET /v1/history`

Query raw event time-series.

Query params: `domain`, `kind`, `from` (ISO), `to` (ISO), `limit` (max 2000, default 500)

### `GET /v1/history/scores`

Query score history with breakdown. Same query params (minus `domain`/`kind`).

---

## Devices

### `GET /v1/devices`

### `POST /v1/devices/:id/command`

```json
{ "command": "dim", "args": { "level": 30, "kelvin": 2700 }, "reason": "manual" }
```

### `PATCH /v1/devices/:id`

Update label or online status: `{ "label": "...", "online": false }`

---

## Actions

### `GET /v1/actions?status=PENDING&limit=20`

### `PATCH /v1/actions/:id`

Acknowledge: `{ "status": "ACKED" }` or `{ "status": "FAILED" }`

---

## Modes

### `GET /v1/config/modes`

### `POST /v1/config/mode`

```json
{ "mode": "energy_guardian" }
```

---

## Chat (AI)

### `POST /v1/chat`

Natural language query grounded in live sensor data. Requires `ANTHROPIC_API_KEY` on the server.

```json
{ "message": "Should I run the air purifier?" }
```

**Response:**
```json
{
  "reply": "PM2.5 is 7 µg/m³ — well below the 15 µg/m³ threshold. No purifier needed.",
  "score": 87,
  "signals": [],
  "action": null
}
```

Commands like "switch to energy guardian" are automatically executed.

---

## Webhooks

### `GET /v1/webhooks`
### `POST /v1/webhooks`
### `DELETE /v1/webhooks/:id`

Events: `score.updated`, `alert.triggered`, `*` (all)

Webhook POST body:
```json
{ "event": "alert.triggered", "installationId": "clx...", "payload": { "signals": [...] }, "ts": 1730000000000 }
```

Verify with `X-Aurora-Signature` (HMAC-SHA256 of the raw JSON body using your webhook secret).

---

## Simulation

### `POST /v1/simulate`

```json
{ "scenario": "stress" }
```

Scenarios: `healthy` | `stress` | `peak_solar`

---

## Export & Audit

### `GET /v1/export` — full installation snapshot
### `GET /v1/audit?limit=50` — audit log entries

---

## Real-time (WebSocket)

`WS /v1/stream?api_key=<key>`

Server → client messages:

```json
{ "type": "hello",  "installationId": "clx..." }
{ "type": "state",  "state": { ... } }
{ "type": "score",  "score": 84, "breakdown": {...}, "signals": [...], "trend": "improving", "predictedScore": 87 }
{ "type": "action", "action": { "id": "...", "command": "set_ventilation", "args": { "level": "high" }, "reason": "co2_high" } }
{ "type": "mode",   "mode": "energy_guardian" }
```

---

## Health & Metrics

### `GET /health`

```json
{ "ok": true, "ts": 1730000000000, "checks": { "redis": "ok", "db": "ok" }, "version": "2.0.0" }
```

### `GET /metrics`

Prometheus-compatible text format. Exposes `aurora_events_total`, `aurora_insights_total`, `aurora_actions_total`, `aurora_up`.
