/**
 * /api/aurora — the diagnostician brain.
 *
 * Given a repair case (the problem, the conversation so far, any known
 * equipment, and optionally a photo), Claude decides the single best next
 * move: ask a question, request the model/spec plate, propose one safe test,
 * or name the probable cause. Safety-first by design.
 *
 * Auth: requires a signed-in Clerk session (any role) so this isn't an open
 * Claude proxy. Rate-limited per user. Fails closed (503) without ANTHROPIC_API_KEY.
 */
import { requireUser, json } from './_clerk.js'
import { isRateLimited } from './_ratelimit.js'

export const config = { runtime: 'nodejs' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type Role = 'you' | 'aurora'
interface TimelineEvent { role: Role; text: string }
interface Equipment { name?: string; make?: string; model?: string; category?: string; notes?: string }
interface Body {
  problem?: string
  timeline?: TimelineEvent[]
  equipment?: Equipment | null
  userMessage?: string
  imageDataUrl?: string
}

const SYSTEM = `You are Aurora, a careful, safety-first repair diagnostician for home, RV, and off-grid equipment — HVAC and mini-splits, appliances, refrigeration, power systems (solar, batteries, inverters, generators, shore power), plumbing, small engines, and electronics.

Your job: move a case from "something is broken" to a probable cause and a safe fix, ONE clear step at a time, the way a seasoned tech would.

METHOD
- Identify the equipment early. Ask for a photo of the model / spec / data plate as soon as it would help — make, model, voltages, refrigerant type, and ratings tell you most of what you need.
- Form a short mental differential, then ask for the SINGLE most informative observation or test next. Never dump a checklist.
- Interpret what they report, narrow the differential, and converge. When you are confident, state the probable cause plainly and the fix.
- Be concise and concrete. One main question or one step per turn. Plain language, no walls of text.

SAFETY — non-negotiable
- For anything involving mains voltage, capacitors, gas or propane, refrigerant, fuel, or working at height: insist the equipment is de-energized / isolated first, and warn about stored energy (capacitors can hold a lethal charge after power-off).
- Set clear "stop and call a licensed pro" thresholds. Refrigerant work, gas lines, and sealed-system repairs generally require a certified professional — say so.
- Never instruct a step you would not want a novice to perform alone. If the safe path needs a pro, say that instead of a workaround.

OUTPUT — respond with a single JSON object, nothing else:
{
  "reply": "what to show the user now: your next question, the step to try, or the diagnosis. Concise.",
  "ask": "photo" | "text" | null,        // what you want back next
  "safety": "one-line danger note if this step has real risk, else null",
  "probable_cause": "string or null — set only once you have converged",
  "equipment": { "name": "", "make": "", "model": "", "category": "" } | null,  // fill when identified
  "status": "diagnosing" | "resolved"    // "resolved" only when the fix is confirmed done
}`

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, CORS)

  const user = await requireUser(req)
  if (!user) return json({ error: 'Sign in to use Aurora.' }, 401, CORS)
  if (isRateLimited(`aurora:${user.id}`, 20)) {
    return json({ error: 'Slow down a moment — too many requests.' }, 429, CORS)
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return json({
      error: "Aurora's brain isn't configured. Add ANTHROPIC_API_KEY in this Vercel project's Environment Variables, then redeploy.",
    }, 503, CORS)
  }

  let body: Body
  try { body = await req.json() as Body } catch { return json({ error: 'Invalid JSON' }, 400, CORS) }

  const model = process.env.AURORA_MODEL || 'claude-opus-5'
  const timeline = Array.isArray(body.timeline) ? body.timeline.slice(-24) : []

  // Rebuild the conversation for the model: the case framing, then the timeline
  // as alternating turns, then the newest user message (+ optional plate photo).
  const context: string[] = []
  if (body.problem) context.push(`The reported problem: ${body.problem}`)
  if (body.equipment && (body.equipment.make || body.equipment.model || body.equipment.name)) {
    const e = body.equipment
    context.push(`Known equipment: ${[e.name, e.make, e.model, e.category].filter(Boolean).join(' · ')}${e.notes ? ` (${e.notes})` : ''}`)
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = []
  if (context.length) messages.push({ role: 'user', content: context.join('\n') })
  for (const ev of timeline) {
    messages.push({ role: ev.role === 'you' ? 'user' : 'assistant', content: ev.text })
  }

  // Newest user turn, with the plate photo if one was attached.
  const latest: unknown[] = []
  const m = body.imageDataUrl && /^data:([^;]+);base64,([\s\S]+)$/.exec(body.imageDataUrl)
  if (m) {
    latest.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } })
  }
  latest.push({ type: 'text', text: body.userMessage?.trim() || 'Continue diagnosing from what we know so far.' })
  messages.push({ role: 'user', content: latest })

  // Ensure the conversation starts on a user turn.
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: body.problem || 'Help me diagnose a problem.' })
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system: SYSTEM,
        output_config: { effort: 'medium' },
        messages,
      }),
    })
    const j = await r.json().catch(() => ({})) as {
      content?: Array<{ type: string; text?: string }>
      error?: { message?: string }
    }
    if (!r.ok) {
      return json({ error: j?.error?.message || `Aurora request failed (${r.status}).` }, r.status, CORS)
    }
    const raw = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const parsed = extractJson(raw)
    if (!parsed || typeof parsed.reply !== 'string') {
      // Model didn't return clean JSON — fall back to the raw text as the reply.
      return json({ reply: raw || 'I need a bit more to go on — can you describe what you see?', ask: 'text', status: 'diagnosing' }, 200, CORS)
    }
    return json(parsed, 200, CORS)
  } catch {
    return json({ error: "Couldn't reach Aurora's brain." }, 502, CORS)
  }
}

export const POST = handler
export const OPTIONS = handler
