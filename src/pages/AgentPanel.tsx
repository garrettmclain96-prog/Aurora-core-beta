import { PageTransition } from '../components/PageTransition'
import { PageHeader, StatusDot, SectionLabel } from '../components/Layout'
import { agents } from '../lib/seed'

export function AgentPanel() {
  return (
    <div>
      <PageHeader
        title="Agent Panel"
        subtitle="Four specialized AI agents sharing weighted state vectors via consensus bus"
      />

      <div className="p-6 space-y-6">
        {/* Consensus status bar */}
        <div className="card p-4">
          <SectionLabel>Consensus Bus</SectionLabel>
          <div className="flex items-center gap-4">
            {agents.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border"
                  style={{ borderColor: a.color + '50', backgroundColor: a.color + '10' }}
                >
                  <StatusDot status={a.status} />
                  <span className="text-xs font-display font-semibold" style={{ color: a.color }}>{a.name.split(' ')[0]}</span>
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
            Priority arbitration: <span className="text-[var(--color-amber)]">Health</span> → Safety → Comfort → Efficiency
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
                className="text-xs px-3 py-2 rounded-md mb-4 border"
                style={{ borderColor: agent.color + '30', backgroundColor: agent.color + '08', color: agent.color }}
              >
                <span className="font-display font-medium">{agent.action}</span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2">
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
              <div className="mt-4">
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
                <div className="mt-3 text-[10px] text-[var(--color-amber)] font-display">
                  ⚠ {agent.conflicts} conflict pending arbitration
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
