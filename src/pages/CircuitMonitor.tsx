import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, SectionLabel } from '../components/Layout'
import { circuits, powerHistory, type Circuit } from '../lib/seed'

function CircuitBreaker({
  circuit, onToggle,
}: { circuit: Circuit; onToggle: (id: string) => void }) {
  const loadPct = (circuit.power / (circuit.limit * circuit.voltage)) * 100
  const warn = loadPct > 75

  return (
    <div className={clsx('card card-glow p-4 space-y-3', circuit.status === 'tripped' && 'border-[var(--color-red)]')}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-display font-bold text-[var(--color-text)]">{circuit.name}</div>
          <div className="text-[10px] font-display text-[var(--color-muted)]">{circuit.id} · {circuit.phase}</div>
        </div>
        <div className="flex items-center gap-2">
          {circuit.critical && (
            <span className="text-[9px] font-display px-1.5 py-0.5 rounded bg-[oklch(0.65_0.22_25_/_0.15)] text-[var(--color-red)] border border-[oklch(0.65_0.22_25_/_0.3)]">CRIT</span>
          )}
          {warn && <AlertTriangle className="w-3 h-3 text-[var(--color-amber)]" />}
        </div>
      </div>

      {/* Load bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--color-muted)] font-display">Load</span>
          <span className="mono text-[10px]" style={{ color: warn ? 'var(--color-amber)' : 'var(--color-green)' }}>{loadPct.toFixed(0)}%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--color-elevated)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(loadPct, 100)}%`,
              backgroundColor: loadPct > 90 ? 'var(--color-red)' : loadPct > 75 ? 'var(--color-amber)' : 'var(--color-green)',
            }}
          />
        </div>
      </div>

      {/* Readings */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { l: 'Current', v: `${circuit.current}`, u: 'A'  },
          { l: 'Voltage', v: `${circuit.voltage}`, u: 'V'  },
          { l: 'Power',   v: `${(circuit.power / 1000).toFixed(2)}`, u: 'kW' },
        ].map(({ l, v, u }) => (
          <div key={l} className="bg-[var(--color-elevated)] rounded px-2 py-1.5 text-center">
            <div className="text-[8px] font-display text-[var(--color-muted)] uppercase">{l}</div>
            <div className="mono text-sm font-bold text-[var(--color-text)]">{v}</div>
            <div className="text-[8px] text-[var(--color-muted)]">{u}</div>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(circuit.id)}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-display font-semibold transition-all',
          circuit.status === 'on'
            ? 'bg-[oklch(0.74_0.17_145_/_0.15)] text-[var(--color-green)] border border-[oklch(0.74_0.17_145_/_0.3)] hover:bg-[oklch(0.74_0.17_145_/_0.25)]'
            : 'bg-[oklch(0.65_0.22_25_/_0.12)] text-[var(--color-red)]   border border-[oklch(0.65_0.22_25_/_0.3)]   hover:bg-[oklch(0.65_0.22_25_/_0.22)]',
        )}
      >
        <Zap className="w-3 h-3" />
        {circuit.status === 'on' ? 'ON · Click to switch off' : 'OFF · Click to restore'}
      </button>
    </div>
  )
}

export function CircuitMonitor() {
  const [circs, setCircs] = useState(circuits)

  const toggle = (id: string) => {
    setCircs(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === 'on' ? 'off' : 'on' } : c
    ))
  }

  const totalLoad = circs.filter(c => c.status === 'on').reduce((s, c) => s + c.power, 0) / 1000

  return (
    <div>
      <PageHeader
        title="Circuit Monitor"
        subtitle="Breaker panel · Real-time load management"
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-[10px] font-display tracking-wide uppercase text-[var(--color-muted)] mb-1">Total Load</div>
            <div className="mono text-2xl font-bold text-[var(--color-amber)]">{totalLoad.toFixed(2)} <span className="text-sm text-[var(--color-muted)]">kW</span></div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-display tracking-wide uppercase text-[var(--color-muted)] mb-1">Active Circuits</div>
            <div className="mono text-2xl font-bold text-[var(--color-cyan)]">{circs.filter(c => c.status === 'on').length} <span className="text-sm text-[var(--color-muted)]">/ {circs.length}</span></div>
          </div>
          <div className="card p-4">
            <div className="text-[10px] font-display tracking-wide uppercase text-[var(--color-muted)] mb-1">Panel Capacity</div>
            <div className="mono text-2xl font-bold text-[var(--color-green)]">{((totalLoad / 24) * 100).toFixed(0)} <span className="text-sm text-[var(--color-muted)]">%</span></div>
          </div>
        </div>

        {/* Breaker panel */}
        <div className="card p-4">
          <SectionLabel>Breaker Panel</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {circs.map(c => (
              <CircuitBreaker key={c.id} circuit={c} onToggle={toggle} />
            ))}
          </div>
        </div>

        {/* Power history */}
        <div className="card p-4">
          <SectionLabel>Consumption History · 24 Hours</SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={powerHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-amber)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Share Tech Mono' }} interval={11} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Share Tech Mono' }} unit="kW" />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }} />
              <Area type="monotone" dataKey="load" name="Load (kW)" stroke="var(--color-amber)" fill="url(#gL)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
