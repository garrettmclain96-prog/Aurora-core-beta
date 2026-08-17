# Concepts

## How Aurora thinks

```
events ─▶ state ─▶ score + signals ─▶ actions ─▶ audit
                       ▲
                       │
                     mode
```

- **events** are atomic readings (`{ domain, kind, value }`)
- **state** is the latest known value per signal, kept in Redis
- **score** is a 0–100 number derived from sub-scores for each domain
- **signals** are human-readable diagnostics with optional recommendations
- **actions** are commands Aurora wants to issue to a device
- **mode** rebalances how the score is weighted

## What is the System Score?

`score = round( energyScore · w_e + bioScore · w_b + envScore · w_v )`

Mode weights:

| Mode               | energy | bio | env  |
|--------------------|--------|-----|------|
| Energy Guardian    | 0.60   | 0.15| 0.25 |
| Health Sentinel    | 0.15   | 0.60| 0.25 |
| Habitat Optimizer  | 0.33   | 0.33| 0.34 |

Sub-score heuristics live in `apps/api/src/engine/scoring.ts`. Tune freely;
they are explicit and side-effect free.

## Modes

- **Energy Guardian** — solar self-consumption, peak shaving, cost-aware
- **Health Sentinel** — HR / HRV / stress (non-medical, conservative)
- **Habitat Optimizer** — balanced comfort and air quality

## Safety and overrides

- Aurora never executes a command itself — it produces an **Action** record.
  Your device adapter is responsible for executing (or rejecting) it.
- Every action and mode change is written to `AuditLog`.
- Bio scoring is intentionally non-medical and conservative. Do **not** use
  Aurora as a clinical device.
