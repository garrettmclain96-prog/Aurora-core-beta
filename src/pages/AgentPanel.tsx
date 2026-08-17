import { useState, useCallback } from 'react'
import { Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { PageHeader, StatusDot, SectionLabel } from '../components/Layout'
import { agents } from '../lib/seed'

type AgentId = typeof agents[number]['id']

const AGENT_PERSONAS: Record<string, string> = {
  health:    'You are the Health & Biometrics agent in Aurora Core, a 7-layer cognitive-energy platform. You analyze physiological signals (HRV 44ms, HR 68 BPM, stress index 26/100, sleep score 89/100, body temp 98.2°F) and make environmental recommendations.',
  safety:    'You are the Safety & Security agent in Aurora Core. You monitor circuit health, battery thermal state, and grid anomalies. Current status: all circuits nominal, battery temp 29.1°C.',
  comfort:   'You are the Comfort & Habitability agent in Aurora Core. You optimize thermal comfort, air quality (CO₂ 612 ppm), lighting, and acoustic environment based on occupancy.',
  efficiency:'You are the Energy Efficiency agent in Aurora Core. You manage load dispatch, solar harvest, battery charge cycles, and grid arbitrage. Current: 9.17 kW load, 3.42 kW solar, 74% SoC.',
}

export function AgentPanel() {
  const [outputs, setOutputs]   = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState<Record<string, boolean>>({})
  const [errors, setErrors]     = useState<Record<string, string>>({})

  const runAgent = useCallback(async (agentId: AgentId, agentName: string) => {
    setLoading(prev => ({ ...prev, [agentId]: true }))
    setErrors(prev => ({ ...prev, [agentId]: '' }))

    const persona = AGENT_PERSONAS[agentId] ?? `You are the ${agentName} agent in Aurora Core, an AI-powered energy management system.`
    const prompt  = `${persona}\n\nGiven the current system state, provide a 2-3 sentence status assessment and ONE specific action you are taking right now. Be technical and precise. Start with "[${agentName.split(' ')[0].toUpperCase()}]:"`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: persona,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { content?: { type: string; text: string }[] }
      const text  = data.content?.find(b => b.type === 'text')?.text ?? 'No response.'
      setOutputs(prev => ({ ...prev, [agentId]: text }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setErrors(prev => ({
        ...prev,
        [agentId]: msg.includes('ANTHROPIC_API_KEY') || msg.includes('401')
          ? 'API key not set. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables.'
          : `Error: ${msg}`,
      }))
    } finally {
      setLoading(prev => ({ ...prev, [agentId]: false }))
    }
  }, [])

  const runAll = useCallback(async () => {
    for (const agent of agents) {
      await runAgent(agent.id as AgentId, agent.name)
    }
  }, [runAgent])

  return (
    <div>
      <PageHeader
        title="Agent Panel"
        subtitle="Four specialized AI agents sharing weighted state vectors via consensus bus"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Consensus status bar */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Consensus Bus</SectionLabel>
            <button
              onClick={runAll}
              disabled={Object.values(loading).some(Boolean)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display transition-all
                bg-[oklch(0.82_0.16_196_/_0.12)] text-[var(--color-cyan)] border border-[oklch(0.82_0.16_196_/_0.25)]
                hover:bg-[oklch(0.82_0.16_196_/_0.20)] disabled:opacity-40"
            >
              {Object.values(loading).some(Boolean)
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                : <><RefreshCw className="w-3 h-3" /> Run All Agents</>}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {agents.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border"
                  style={{ borderColor: a.color + '50', backgroundColor: a.color + '10' }}
                >
                  <StatusDot status={a.status} />
                  <span className="text-xs font-display font-semibold" style={{ color: a.color }}>
                    {a.name.split(' ')[0]}
                  </span>
                  <span className="mono text-xs text-[var(--color-muted)]">{a.confidence}%</span>
                </div>
                {i < agents.length - 1 && (
                  <div className="flex items-center">
                    <div className="h-px w-4 bg-[var(--color-border)]" />
                    <div className="w-1 h-1 rounded-full bg-[var(--color-borderhi)]" />
                    <div className="h-px w-4 bg-[var(--color-border)]" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] font-display text-[var(--color-muted)]">
            Priority arbitration:{' '}
            <span className="text-[var(--color-amber)]">Health</span> → Safety → Comfort → Efficiency
            {agents.some(a => a.status === 'conflict') && (
              <span className="ml-3 text-[var(--color-amber)]">⚠ 1 active conflict · resolution in progress</span>
            )}
          </div>
        </div>

        {/* Agent cards 2×2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="card card-glow p-5"
              style={agent.status === 'conflict' ? { borderColor: 'var(--color-amber)' } : undefined}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border"
                    style={{ borderColor: agent.color + '40', backgroundColor: agent.color + '15' }}
                  >
                    {agent.icon}
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-[var(--color-text)]">{agent.name}</div>
                    <div className="text-[10px] font-display tracking-wide text-[var(--color-muted)] uppercase">{agent.domain}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot status={agent.status} />
                  <span className="text-[10px] font-display capitalize text-[var(--color-muted)]">{agent.status}</span>
                </div>
              </div>

              {/* Current action */}
              <div
                className="text-xs px-3 py-2 rounded-md mb-3 border"
                style={{ borderColor: agent.color + '30', backgroundColor: agent.color + '08', color: agent.color }}
              >
                <span className="font-display font-medium">{agent.action}</span>
              </div>

              {/* AI Response area */}
              <div className="mb-4 min-h-[64px] bg-[var(--color-elevated)] rounded-md px-3 py-2.5">
                {loading[agent.id] && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] font-display">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: agent.color }} />
                    Agent is reasoning…
                  </div>
                )}
                {errors[agent.id] && (
                  <div className="text-[10px] text-[var(--color-amber)] font-display leading-relaxed">
                    ⚠ {errors[agent.id]}
                  </div>
                )}
                {outputs[agent.id] && !loading[agent.id] && (
                  <div className="text-[11px] text-[var(--color-text)] leading-relaxed font-sans">
                    {outputs[agent.id]}
                  </div>
                )}
                {!loading[agent.id] && !errors[agent.id] && !outputs[agent.id] && (
                  <div className="text-[10px] text-[var(--color-dim)] font-display italic">
                    Click "Query Agent" to get live intelligence…
                  </div>
                )}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {agent.metrics.map(m => (
                  <div key={m.label} className="bg-[var(--color-elevated)] rounded-md px-3 py-2">
                    <div className="text-[9px] font-display tracking-wide uppercase text-[var(--color-muted)] mb-0.5">{m.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="mono text-base font-bold text-[var(--color-text)]">{m.value}</span>
                      <span className="text-[9px] text-[var(--color-muted)]">{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confidence bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-display text-[var(--color-muted)]">Model Confidence</span>
                  <span className="mono text-[10px]" style={{ color: agent.color }}>{agent.confidence}%</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--color-elevated)]">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${agent.confidence}%`, backgroundColor: agent.color }}
                  />
                </div>
              </div>

              {agent.conflicts > 0 && (
                <div className="mb-3 text-[10px] text-[var(--color-amber)] font-display">
                  ⚠ {agent.conflicts} conflict pending arbitration
                </div>
              )}

              {/* Query button */}
              <button
                onClick={() => runAgent(agent.id as AgentId, agent.name)}
                disabled={!!loading[agent.id]}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-display transition-all disabled:opacity-40"
                style={{
                  borderColor: agent.color + '50',
                  border: '1px solid',
                  backgroundColor: agent.color + '10',
                  color: agent.color,
                }}
              >
                {loading[agent.id]
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Reasoning…</>
                  : <><Sparkles className="w-3 h-3" /> Query Agent</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
