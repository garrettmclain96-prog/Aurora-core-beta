/**
 * Aurora Core — Agent Service
 * Each of the 4 cognitive agents has its own logic module here.
 * Agents can be queried individually or run as a consensus group.
 *
 * Architecture: L3 Cognitive Core
 * Priority: Health > Safety > Comfort > Efficiency
 */

import type { AgentId, AgentQueryResult, LiveMetrics, ChatMessage } from '../types'

/** System context injected into every agent prompt */
function buildSystemContext(agentId: AgentId, metrics: LiveMetrics): string {
  const base = `You are Aurora Core's ${agentId.toUpperCase()} agent — one of four specialized AI agents in a seven-layer cognitive-energy ecosystem built by Garrett McLain for his son Zachary Lee McLain (born April 13, 2026).

LIVE SYSTEM STATE:
- Energy: Load ${metrics.load}kW | Solar ${metrics.solar}kW | Battery ${metrics.batterySoc}% | Grid ${metrics.grid.toFixed(2)}kW
- Biometrics: HR ${metrics.heartRate}bpm | HRV ${metrics.hrv}ms | SpO2 ${metrics.spo2}% | Stress ${metrics.stress}/100
- Environment: CO₂ ${metrics.co2}ppm | Temp ${metrics.temp}°F | Humidity ${metrics.humidity}%RH | PM2.5 ${metrics.pm25}μg/m³

Your domain and persona:`

  const personas: Record<AgentId, string> = {
    health: `${base}
You are the HEALTH agent. You monitor biometrics, detect anomalies, and recommend wellness actions.
Your priority is highest in the consensus hierarchy. Focus on HRV trends, stress patterns, and sleep quality.
Respond in 2-3 sentences max. Start with "[HEALTH]:"`,

    energy: `${base}
You are the ENERGY agent. You optimize load dispatch, solar harvest, battery cycles, and grid arbitrage.
You are currently in conflict with the Behavior agent over the 18:00 schedule window.
Focus on financial savings, battery longevity, and peak shave opportunities.
Respond in 2-3 sentences max. Start with "[ENERGY]:"`,

    behavior: `${base}
You are the BEHAVIOR agent. You recognize patterns, model habits, and predict occupancy.
You have learned 24 behavioral patterns with 91% accuracy. Your next event is in 2.3 hours.
Focus on comfort, routine optimization, and adaptive learning insights.
Respond in 2-3 sentences max. Start with "[BEHAVIOR]:"`,

    environment: `${base}
You are the ENVIRONMENT agent. You monitor air quality, ambient conditions, and sustainability.
CO₂ is at ${metrics.co2}ppm — advise on ventilation and comfort adjustments.
Focus on air quality, thermal comfort, and environmental sustainability.
Respond in 2-3 sentences max. Start with "[ENVIRONMENT]:"`,
  }

  return personas[agentId]
}

/** Query a single agent via the Aurora API */
export async function queryAgent(
  agentId: AgentId,
  prompt: string,
  metrics: LiveMetrics
): Promise<AgentQueryResult> {
  const systemContext = buildSystemContext(agentId, metrics)
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }]
  const start = Date.now()

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemContext }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const data = await res.json() as { content?: { type: string; text?: string }[] }
  const response = data.content?.find(b => b.type === 'text')?.text ?? 'No response.'

  return {
    agentId,
    response,
    timestamp: Date.now(),
    tokensUsed: Math.round((Date.now() - start) / 10), // rough estimate
  }
}

/** Default prompt for each agent's status assessment */
export function getDefaultAgentPrompt(agentId: AgentId): string {
  const prompts: Record<AgentId, string> = {
    health:      'Assess my current biometric state and give your top priority recommendation right now.',
    energy:      'What is the most impactful energy optimization I should execute in the next hour?',
    behavior:    'What pattern have you detected that I should act on today?',
    environment: 'Is my current environment optimal? What single change would have the biggest impact?',
  }
  return prompts[agentId]
}

/** Run all 4 agents in parallel and return results */
export async function runConsensus(metrics: LiveMetrics): Promise<AgentQueryResult[]> {
  const agentIds: AgentId[] = ['health', 'energy', 'behavior', 'environment']
  const results = await Promise.allSettled(
    agentIds.map(id => queryAgent(id, getDefaultAgentPrompt(id), metrics))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<AgentQueryResult> => r.status === 'fulfilled')
    .map(r => r.value)
}
