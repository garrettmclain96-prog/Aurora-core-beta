import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import { CheckCircle2, Bell } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, SectionLabel } from '../components/Layout'
import { initialAlerts, type Alert } from '../lib/seed'

const TYPE_STYLES: Record<Alert['type'], { bg: string; border: string; text: string; label: string }> = {
  warning: { bg: 'oklch(0.80 0.17 72 / 0.10)',  border: 'oklch(0.80 0.17 72 / 0.35)',  text: 'var(--color-amber)', label: 'WARN'  },
  error:   { bg: 'oklch(0.65 0.22 25 / 0.10)',  border: 'oklch(0.65 0.22 25 / 0.35)',  text: 'var(--color-red)',   label: 'ERROR' },
  success: { bg: 'oklch(0.74 0.17 145 / 0.10)', border: 'oklch(0.74 0.17 145 / 0.35)', text: 'var(--color-green)', label: 'OK'    },
  info:    { bg: 'oklch(0.82 0.16 196 / 0.08)', border: 'oklch(0.82 0.16 196 / 0.25)', text: 'var(--color-cyan)',  label: 'INFO'  },
}

export function Alerts() {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const resolve = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  const resolveAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, resolved: true })))
  }

  const visible = alerts.filter(a =>
    filter === 'all'     ? true
    : filter === 'active'  ? !a.resolved
    : a.resolved
  )

  const activeCount = alerts.filter(a => !a.resolved).length

  return (
    <div>
      <PageHeader
        title="Alert Center"
        subtitle="System events · Agent notifications · Audit log"
      />

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-3">
          {(['warning', 'error', 'info', 'success'] as Alert['type'][]).map(type => {
            const count = alerts.filter(a => a.type === type && !a.resolved).length
            const s = TYPE_STYLES[type]
            return (
              <div key={type} className="card p-3">
                <div className="text-[9px] font-display uppercase tracking-wider mb-1" style={{ color: s.text }}>{s.label}</div>
                <div className="mono text-2xl font-bold" style={{ color: s.text }}>{count}</div>
                <div className="text-[9px] text-[var(--color-muted)]">active</div>
              </div>
            )
          })}
        </div>

        {/* Filter + resolve all */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['all', 'active', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-display capitalize transition-all border',
                  filter === f
                    ? 'bg-[oklch(0.82_0.16_196_/_0.12)] text-[var(--color-cyan)] border-[oklch(0.82_0.16_196_/_0.3)]'
                    : 'text-[var(--color-muted)] border-transparent hover:border-[var(--color-border)]',
                )}
              >
                {f} {f === 'active' && activeCount > 0 && `(${activeCount})`}
              </button>
            ))}
          </div>
          {activeCount > 0 && (
            <button
              onClick={resolveAll}
              className="flex items-center gap-1.5 text-xs font-display text-[var(--color-muted)] hover:text-[var(--color-green)] transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resolve all
            </button>
          )}
        </div>

        {/* Alert list */}
        <div>
          <SectionLabel>
            {filter === 'all' ? 'All Events' : filter === 'active' ? 'Active Alerts' : 'Resolved'}
          </SectionLabel>

          {visible.length === 0 ? (
            <div className="card p-8 text-center">
              <Bell className="w-8 h-8 text-[var(--color-dim)] mx-auto mb-2" />
              <div className="text-sm text-[var(--color-muted)] font-display">No {filter} alerts</div>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map(alert => {
                const s = TYPE_STYLES[alert.type]
                return (
                  <div
                    key={alert.id}
                    className={clsx(
                      'card p-4 flex items-start gap-4 transition-all',
                      alert.resolved && 'opacity-50',
                    )}
                    style={{ borderColor: alert.resolved ? undefined : s.border, backgroundColor: alert.resolved ? undefined : s.bg }}
                  >
                    {/* Badge */}
                    <div
                      className="text-[9px] font-display font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5"
                      style={{ color: s.text, borderColor: s.border, backgroundColor: s.bg }}
                    >
                      {s.label}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-display font-semibold text-[var(--color-text)]">{alert.title}</span>
                        <span className="text-[10px] font-display text-[var(--color-dim)] uppercase">{alert.agent}</span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{alert.message}</p>
                    </div>

                    {/* Time + resolve */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="mono text-[10px] text-[var(--color-dim)]">{alert.time}</span>
                      {!alert.resolved && (
                        <button
                          onClick={() => resolve(alert.id)}
                          className="flex items-center gap-1 text-[10px] font-display text-[var(--color-muted)] hover:text-[var(--color-green)] transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Resolve
                        </button>
                      )}
                      {alert.resolved && (
                        <span className="text-[10px] font-display text-[var(--color-green)]">✓ Resolved</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
