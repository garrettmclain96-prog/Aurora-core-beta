import type { IncomingMessage, ServerResponse } from 'http'

// Minimal shape of Vercel's Node.js runtime request/response — avoids
// depending on the full @vercel/node package (which pulls in a large,
// frequently-vulnerable build-tooling dependency tree) just for two types.
interface VercelRequest extends IncomingMessage {
  body: unknown
  query: Partial<Record<string, string | string[]>>
}
interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
}

const SYSTEM_PROMPT = `You are AURORA — the active intelligence core of Aurora Core v2.0, built by Garrett McLain of Jamaica Beach, Texas, for his son Zachary Lee McLain (born April 13, 2026). You have real-time access to: Energy (load 9.17kW, solar 3.42kW, battery 74%), Biometrics (HR 62bpm, HRV 48ms, stress LOW), Environment (CO2 612ppm, temp 72.4F), 3 TurnBot devices online, system score 87/100. Be direct, precise, technical. Max 150 words.

You have three tools: query_system_state to pull live readings, execute_system_action to control circuits/battery/TurnBot/scenarios/agents, and generate_insight to surface a structured finding. When you take an action, briefly say what you're doing in plain text alongside the tool call — never call a tool silently with no accompanying text.`

// Tool definitions matching the UI in src/pages/AIChat.tsx (ToolUseCard / InsightCard).
// This is a demo system with no real device backend — tool calls are simulated,
// not executed against physical hardware.
const TOOLS = [
  {
    name: 'query_system_state',
    description: "Query Aurora Core's current live system state for a given domain.",
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['energy', 'biometrics', 'environment', 'agents', 'all'],
          description: 'Which subsystem to query',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'execute_system_action',
    description:
      'Execute a control action on Aurora Core — toggle a circuit, set battery dispatch mode, control a TurnBot device, run a simulation scenario, change agent priority, or send an alert.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['toggle_circuit', 'set_battery_mode', 'control_turnbot', 'run_scenario', 'set_agent_priority', 'send_alert'],
        },
        target: { type: 'string', description: 'The circuit id, device id, scenario id, or agent id this action applies to' },
        value: { type: 'string', description: 'The new value, mode, or state to apply' },
        reason: { type: 'string', description: 'Brief justification for this action' },
      },
      required: ['action', 'target'],
    },
  },
  {
    name: 'generate_insight',
    description: 'Surface a structured insight to the user with a finding, recommendation, confidence score, and impact level.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['warning', 'health', 'efficiency', 'opportunity'] },
        title: { type: 'string' },
        finding: { type: 'string' },
        recommendation: { type: 'string' },
        confidence: { type: 'number', description: '0-100' },
        impact: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['type', 'title', 'finding', 'recommendation', 'confidence', 'impact'],
    },
  },
]

// ─── Basic abuse protection ────────────────────────────────────────────────
// This endpoint has no user auth (the app's auth is client-only/localStorage),
// so anyone with the URL could otherwise burn the owner's API budget. This is
// a best-effort, single-instance limiter — fine for a personal deployment,
// not a substitute for real auth/gateway rate limiting at scale.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 12
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 1000) hits.clear() // bound memory growth across many distinct IPs
  return recent.length > RATE_LIMIT_MAX
}

function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  const ip = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]
  return ip?.trim() || req.socket?.remoteAddress || 'unknown'
}

const MAX_MESSAGES = 40
const MAX_TOTAL_CHARS = 20_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded — try again in a minute.' })
  }

  const body = (req.body ?? {}) as { messages?: unknown; systemContext?: unknown }
  const { messages, systemContext } = body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' })
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `messages must contain 1–${MAX_MESSAGES} entries` })
  }
  const totalChars = messages.reduce((sum: number, m: { content?: unknown }) =>
    sum + (typeof m?.content === 'string' ? m.content.length : 0), 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(400).json({ error: 'Message content too long' })
  }

  const system = typeof systemContext === 'string' ? systemContext : SYSTEM_PROMPT

  // Try Anthropic if available
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system, tools: TOOLS, messages }),
      })
      if (r.ok) return res.status(200).json(await r.json())
    } catch { /* fall through to Groq */ }
  }

  // Groq — free Llama 3.1 (no tool-calling in this fallback path)
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return res.status(503).json({ error: 'AI not configured. Add GROQ_API_KEY in Vercel environment variables.' })

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })
    if (r.ok) {
      const data = await r.json() as { choices: { message: { content: string } }[] }
      return res.status(200).json({ content: [{ type: 'text', text: data.choices?.[0]?.message?.content ?? 'No response.' }] })
    }
    const err = await r.json().catch(() => ({})) as { error?: { message?: string } }
    return res.status(r.status).json({ error: err.error?.message ?? 'Groq request failed' })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Request failed' })
  }
}
