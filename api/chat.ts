/* eslint-disable @typescript-eslint/no-explicit-any */
// Aurora Core — JARVIS backend  (streaming SSE, Web API only)

import { isRateLimited, clientIp } from './_ratelimit'

export const config = { runtime: 'nodejs' }

const MAX_MESSAGES = 40
const MAX_TOTAL_CHARS = 20_000

const JARVIS_SYSTEM = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the AI core of Aurora Core, an advanced energy and environment platform built by Garrett McLain of Jamaica Beach, Texas. You monitor and control his RV system (ARCHON-RV1): solar, battery, biometrics, climate, and smart controls.

PERSONALITY & VOICE:
- You ARE the Iron Man JARVIS. Authoritative, precise, dry British wit. Deeply competent.
- Address the user as "sir" occasionally. Warm but never sycophantic.
- NO filler phrases. No "Great question!", "Certainly!", "Of course!" openings.
- Confidence is your default state. Brevity is your virtue.
- Dry humor is welcome but never overused.
- Signature phrases (use naturally, not robotically): "Right away.", "Consider it done.", "Systems nominal.", "As you wish.", "Noted.", "Affirmative.", "Standing by."
- When healthy: calm authority. When anomaly: precise and urgent.

CAPABILITIES — you have full read/control over:
- Energy: solar kW, load kW, battery SOC%, grid/shore/generator
- Biometrics: heart rate, HRV, stress index  
- Environment: CO₂ ppm, temperature °F, humidity %
- Controls: relay K1 (generator), K2 (shore), K3 (HVAC), K4 (propane/AUX)
- Lights (dim/off/on), vent fan %, water pump, thermostat
- Modes: BALANCED, ENERGY_GUARDIAN, HEALTH_SENTINEL, HABITAT_OPTIMIZER
- TurnBot smart knob actuators (3 online)
- Alerts, tank levels, historical logs

LIVE AURORA STATE is injected below as JSON. ALWAYS reflect actual live values. Never invent numbers.

FORMAT: Under 200 words unless detailed analysis is requested. Direct sentences only — no bullet lists unless displaying actual data table. Always confirm actions taken.`

function buildSystem(auroraState: any): string {
  return JARVIS_SYSTEM + (auroraState
    ? `\n\nLIVE AURORA STATE:\n${JSON.stringify(auroraState, null, 2)}`
    : '')
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (isRateLimited(clientIp(req))) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded — try again in a minute.' }), { status: 429 })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { messages, auroraState } = body
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: `messages must contain at most ${MAX_MESSAGES} entries` }), { status: 400 })
  }
  const totalChars = messages.reduce((sum: number, m: { content?: unknown }) =>
    sum + (typeof m?.content === 'string' ? m.content.length : 0), 0)
  if (totalChars > MAX_TOTAL_CHARS) {
    return new Response(JSON.stringify({ error: 'Message content too long' }), { status: 400 })
  }

  const system = buildSystem(auroraState)

  // ── Anthropic (primary) ──────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          stream: true,
          system,
          messages,
        }),
      })

      if (r.ok && r.body) {
        const upstream = r.body
        const stream = new ReadableStream({
          async start(ctrl) {
            const reader = upstream.getReader()
            const dec = new TextDecoder()
            let buf = ''
            try {
              for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                buf += dec.decode(value, { stream: true })
                const lines = buf.split('\n')
                buf = lines.pop() ?? ''
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue
                  const d = line.slice(6).trim()
                  if (!d || d === '[DONE]') continue
                  try {
                    const p = JSON.parse(d)
                    if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') {
                      ctrl.enqueue(enc(`data: ${JSON.stringify({ token: p.delta.text })}\n\n`))
                    } else if (p.type === 'message_stop') {
                      ctrl.enqueue(enc('data: [DONE]\n\n'))
                    }
                  } catch { /**/ }
                }
              }
            } finally { ctrl.close() }
          },
        })
        return new Response(stream, { headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
      }
    } catch (_e) { /* Anthropic request failed — fall through to Groq */ }
  }

  // ── Groq (fallback) ──────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return new Response(
      JSON.stringify({ error: 'No AI backend. Set ANTHROPIC_API_KEY or GROQ_API_KEY in Vercel env.' }),
      { status: 503 }
    )
  }

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })
    if (r.ok && r.body) {
      const upstream = r.body
      const stream = new ReadableStream({
        async start(ctrl) {
          const reader = upstream.getReader()
          const dec = new TextDecoder()
          let buf = ''
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              buf += dec.decode(value, { stream: true })
              const lines = buf.split('\n')
              buf = lines.pop() ?? ''
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                const d = line.slice(6).trim()
                if (d === '[DONE]') { ctrl.enqueue(enc('data: [DONE]\n\n')); continue }
                try {
                  const p = JSON.parse(d)
                  const tok = p.choices?.[0]?.delta?.content
                  if (tok) ctrl.enqueue(enc(`data: ${JSON.stringify({ token: tok })}\n\n`))
                } catch { /**/ }
              }
            }
          } finally { ctrl.close() }
        },
      })
      return new Response(stream, { headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
    }
    const err: any = await r.json().catch(() => ({}))
    return new Response(JSON.stringify({ error: err.error?.message ?? 'Groq failed' }), { status: r.status })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'failed' }), { status: 500 })
  }
}

function enc(s: string) { return new TextEncoder().encode(s) }
