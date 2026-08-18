/**
 * /api/ingest
 *
 * POST — ESP32-C6 posts telemetry here every ~5s
 * GET  — Frontend polls for latest real snapshot
 *
 * No auth on GET (read-only, no secrets exposed).
 * POST requires the INGEST_SECRET env var to be set — fails closed (503) if
 * it isn't configured, rather than silently accepting unauthenticated writes.
 */
export const config = { runtime: 'nodejs' }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface TelemetryPayload {
  solar_w?:   number; load_w?:   number; batt_soc?:  number; batt_a?:   number
  grid_w?:    number; temp_f?:   number; humidity?:  number; co2_ppm?:  number
  pm25?:      number; hr_bpm?:   number; hrv_ms?:   number; spo2?:     number
  stress?:    number; relay_k1?: boolean; relay_k2?: boolean; relay_k3?: boolean; relay_k4?: boolean
  device_id?: string; fw?: string; rssi?: number
}

interface StoredSnapshot { snapshot: TelemetryPayload; ts: number; score: number; device_id: string }

// In-memory store (persists for the lifetime of the serverless instance)
// In production, swap for Vercel KV: kv.set('latest_snapshot', data)
let latestSnapshot: StoredSnapshot | null = null

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)) }

function computeScore(p: TelemetryPayload): number {
  const sW = p.solar_w ?? 0, lW = p.load_w ?? 1000, soc = p.batt_soc ?? 50
  const coverage = lW <= 0 ? 1 : Math.min(1, sW / lW)
  const eScore = Math.round(clamp(coverage * 48 + (soc / 100) * 28 + (soc > 50 ? 0.85 : 0.5) * 20))
  const hr = p.hr_bpm ?? 65, hrv = p.hrv_ms ?? 50, stress = p.stress ?? 20
  const bScore = Math.round(clamp(100 - (hr > 100 ? (hr-100)*1.2 : 0) + (hrv > 60 ? Math.min(5,(hrv-60)*0.2) : 0) - (hrv < 40 ? (40-hrv)*1.5 : 0) - stress * 0.4))
  const tC = ((p.temp_f ?? 72) - 32) / 1.8
  const vScore = Math.round(clamp(((tC < 18 || tC > 26 ? 70 : 100) + ((p.humidity ?? 50) < 30 || (p.humidity ?? 50) > 60 ? 70 : 100) + ((p.co2_ppm ?? 600) > 1500 ? 35 : (p.co2_ppm ?? 600) > 1000 ? 65 : 100) + ((p.pm25 ?? 5) > 35 ? 35 : 100)) / 4))
  return Math.round(eScore * 0.33 + bScore * 0.33 + vScore * 0.34)
}

function deriveActions(p: TelemetryPayload): string[] {
  const out: string[] = []
  if ((p.co2_ppm   ?? 0) > 1500) out.push('ventilation_max')
  if ((p.co2_ppm   ?? 0) > 1000) out.push('ventilation_increase')
  if ((p.batt_soc  ?? 100) < 15) out.push('emergency_grid_charge')
  if ((p.stress    ?? 0) >= 70)  out.push('dim_lights_30pct')
  if ((p.pm25      ?? 0) > 35)   out.push('run_air_purifier')
  return out
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // GET — return latest snapshot for frontend polling
  if (req.method === 'GET') {
    if (!latestSnapshot) {
      return new Response(JSON.stringify({ ok: true, snapshot: null }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(latestSnapshot), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
  }

  // Auth — fail closed if the device secret isn't configured.
  const secret = process.env.INGEST_SECRET
  if (!secret) {
    return new Response(JSON.stringify({ error: 'INGEST_SECRET not configured on the server' }), { status: 503, headers: CORS })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return new Response(JSON.stringify({ error: 'Expected JSON object' }), { status: 422, headers: CORS })
  }

  const p = body as TelemetryPayload
  const score   = computeScore(p)
  const actions = deriveActions(p)

  latestSnapshot = { snapshot: p, ts: Date.now(), score, device_id: p.device_id ?? 'esp32' }

  return new Response(JSON.stringify({
    ok: true, ts: Date.now(), device_id: p.device_id ?? 'esp32',
    score, actions,
    relay: { k1: p.relay_k1 ?? false, k2: p.relay_k2 ?? true, k3: p.relay_k3 ?? true, k4: p.relay_k4 ?? false },
  }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

export const GET = handler
export const POST = handler
export const OPTIONS = handler
