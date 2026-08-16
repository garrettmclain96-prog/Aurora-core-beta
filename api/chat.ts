import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPT = `You are AURORA — the active intelligence core of Aurora Core v2.0, built by Garrett McLain of Jamaica Beach, Texas, for his son Zachary Lee McLain (born April 13, 2026). You have real-time access to: Energy (load 9.17kW, solar 3.42kW, battery 74%), Biometrics (HR 62bpm, HRV 48ms, stress LOW), Environment (CO2 612ppm, temp 72.4F), 3 TurnBot devices online, system score 87/100. Be direct, precise, technical. Max 150 words.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { messages, systemContext } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' })
  const system = systemContext ?? SYSTEM_PROMPT

  // Try Anthropic if available
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system, messages }),
      })
      if (r.ok) return res.status(200).json(await r.json())
    } catch { /* fall through to Groq */ }
  }

  // Groq — free Llama 3.1
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
