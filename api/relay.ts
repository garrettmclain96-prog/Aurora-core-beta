/**
 * /api/relay — relay command dispatch
 *
 * POST /api/relay
 * Body: { "relay": "k1"|"k2"|"k3"|"k4", "state": true|false, "reason": string }
 *
 * In production: this writes to Vercel KV, which the ESP32
 * polls on its next /api/commands request.
 *
 * K1 = Generator   K2 = Shore Power
 * K3 = HVAC        K4 = Propane / AUX
 *
 * These are physical relays (including generator and propane) — POST
 * requires a signed-in Clerk session with role 'god' or 'admin'. GET
 * (read current state) is open, since it exposes no control surface.
 */
import { requireUser, roleOf, json } from './_clerk'

export const config = { runtime: 'nodejs' }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const RELAY_LABELS: Record<string, string> = {
  k1: 'Generator',
  k2: 'Shore Power',
  k3: 'HVAC',
  k4: 'Propane / AUX',
}

type RelayId = 'k1' | 'k2' | 'k3' | 'k4'

interface RelayCommand {
  relay:   RelayId
  state:   boolean
  reason?: string
}

function isValidRelay(r: unknown): r is RelayId {
  return typeof r === 'string' && ['k1','k2','k3','k4'].includes(r)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // GET — return current relay state (from KV if available, else defaults)
  if (req.method === 'GET') {
    const state = await getRelayState()
    return json({ ok: true, relay: state }, 200, CORS)
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, CORS)
  }

  const caller = await requireUser(req)
  if (!caller) return json({ error: 'Unauthorized' }, 401, CORS)
  const role = roleOf(caller)
  if (role !== 'god' && role !== 'admin') return json({ error: 'Forbidden' }, 403, CORS)

  let body: unknown
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400, CORS)
  }

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Expected JSON object' }, 422, CORS)
  }

  const cmd = body as Partial<RelayCommand>

  if (!isValidRelay(cmd.relay)) {
    return json({ error: 'relay must be k1|k2|k3|k4' }, 422, CORS)
  }

  if (typeof cmd.state !== 'boolean') {
    return json({ error: 'state must be boolean' }, 422, CORS)
  }

  const validated: RelayCommand = {
    relay:  cmd.relay,
    state:  cmd.state,
    reason: typeof cmd.reason === 'string' ? cmd.reason.slice(0, 200) : 'manual',
  }

  // Write to KV store (queued for ESP32 poll)
  await setRelayCommand(validated)

  return json({
    ok:      true,
    ts:      Date.now(),
    relay:   validated.relay,
    label:   RELAY_LABELS[validated.relay],
    state:   validated.state,
    reason:  validated.reason,
    message: `${RELAY_LABELS[validated.relay]} → ${validated.state ? 'ON' : 'OFF'}`,
  }, 200, CORS)
}

// ── KV helpers (Vercel KV when available, in-memory fallback) ────────────────

interface RelayState { k1: boolean; k2: boolean; k3: boolean; k4: boolean }

const DEFAULT_STATE: RelayState = { k1: false, k2: true, k3: true, k4: false }
const memState: RelayState = { ...DEFAULT_STATE }

// @vercel/kv is optional infrastructure — not a project dependency. If you
// provision a KV store, `npm install @vercel/kv` and this will pick it up
// automatically; until then, relay state is in-memory only (per warm
// serverless instance) and the ESP32 poll path won't see queued commands.
async function loadKv(): Promise<{ kv: { get<T>(key: string): Promise<T | null>; set(key: string, value: unknown): Promise<unknown>; lpush(key: string, value: string): Promise<unknown>; ltrim(key: string, start: number, end: number): Promise<unknown> } } | null> {
  try {
    // @ts-expect-error optional dependency, not installed by default
    return await import('@vercel/kv')
  } catch {
    return null
  }
}

async function getRelayState(): Promise<RelayState> {
  const mod = await loadKv()
  if (!mod) return memState
  const stored = await mod.kv.get<RelayState>('relay_state')
  return stored ?? DEFAULT_STATE
}

async function setRelayCommand(cmd: RelayCommand): Promise<void> {
  const mod = await loadKv()
  if (!mod) {
    memState[cmd.relay] = cmd.state
    return
  }
  const current = (await mod.kv.get<RelayState>('relay_state')) ?? { ...DEFAULT_STATE }
  current[cmd.relay] = cmd.state
  await mod.kv.set('relay_state', current)
  // Queue command for ESP32 poll
  await mod.kv.lpush('relay_queue', JSON.stringify({ ...cmd, ts: Date.now() }))
  await mod.kv.ltrim('relay_queue', 0, 49) // keep last 50
}
