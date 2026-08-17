# Security & Reliability

## Authentication
- API keys are 32-byte random tokens prefixed `ak_`.
- Stored as SHA-256 hashes (`ApiKey.hashedKey`); raw value is shown once.
- Rotate by creating a new key and revoking the old one (`revokedAt`).

## Rate limiting
- Token bucket per API key, default 120 req/min, configurable via
  `RATE_LIMIT_PER_MIN`. Counters live in Redis.

## Transport
- Always run behind TLS in production. Trust the proxy with
  `app.set("trust proxy", 1)` if needed.

## Audit log
Every device command and mode change writes a row to `AuditLog`:
```
actor       action            target     meta
api_key:ak_5f device.command  dev_123   { command: "dim", args: { level: 30 } }
engine        device.command  dev_777   { command: "set_ventilation", reason: "co2_high" }
```

## Reliability
- Action records have `attempts` + `status` (PENDING → SENT → ACKED / FAILED)
  so device adapters can retry idempotently.
- Engine never throws on missing sensors — it ingests what it gets and uses
  cached state for the rest. Devices going offline degrade quietly.

## Observability
- `pino` JSON logs everywhere.
- `GET /health` → liveness probe.
- `GET /metrics` → Prometheus stub (extend with `prom-client`).
- Suggested metrics: HTTP latency, ingest rate, decisions/sec, average score
  over time, action failure rate.
