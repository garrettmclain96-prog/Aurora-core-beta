import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader, SectionLabel } from '../components/Layout'
import { battery, batterySocHistory } from '../lib/seed'

function CircularGauge({
  value, max = 100, label, unit, color, size = 120,
}: {
  value: number; max?: number; label: string; unit: string; color: string; size?: number
}) {
  const r = (size - 20) / 2
  const circumference = 2 * Math.PI * r
  const angle = 240 // sweep angle in degrees
  const startAngle = 150
  const pct = Math.min(value / max, 1)
  const strokeLength = circumference * (angle / 360) * pct
  const totalArc = circumference * (angle / 360)

  const polarToCart = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: size / 2 + radius * Math.cos(rad), y: size / 2 + radius * Math.sin(rad) }
  }
  const describeArc = (start: number, end: number, r: number) => {
    const s = polarToCart(start, r), e = polarToCart(end, r)
    const large = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Track */}
        <path d={describeArc(startAngle, startAngle + angle, r)} fill="none"
          stroke="var(--color-elevated)" strokeWidth={8} strokeLinecap="round" />
        {/* Fill */}
        <path d={describeArc(startAngle, startAngle + angle, r)} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={`${strokeLength} ${totalArc}`}
          style={{ filter: `drop-shadow(0 0 6px ${color}99)` }}
        />
        {/* Value */}
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-text)" fontSize={22} fontFamily="Share Tech Mono" fontWeight="bold">{value}</text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="middle"
          fill="var(--color-muted)" fontSize={10} fontFamily="Mulish">{unit}</text>
      </svg>
      <div className="text-[10px] font-display uppercase tracking-wider text-[var(--color-muted)] mt-1">{label}</div>
    </div>
  )
}

type DispatchMode = 'auto' | 'charge' | 'discharge' | 'hold'

export function BatteryPanel() {
  const [mode, setMode] = useState<DispatchMode>('auto')

  const modes: { id: DispatchMode; label: string; color: string }[] = [
    { id: 'auto',      label: 'Auto',      color: 'var(--color-cyan)'   },
    { id: 'charge',    label: 'Charge',    color: 'var(--color-green)'  },
    { id: 'discharge', label: 'Discharge', color: 'var(--color-amber)'  },
    { id: 'hold',      label: 'Hold',      color: 'var(--color-muted)'  },
  ]

  return (
    <div>
      <PageHeader
        title="Battery Management"
        subtitle="State-of-charge · State-of-health · Dispatch control"
      />

      <div className="p-6 space-y-6">
        {/* Gauges + quick stats */}
        <div className="card p-6 aurora-gradient">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex gap-10">
              <CircularGauge value={battery.soc} label="State of Charge" unit="%" color="var(--color-cyan)" />
              <CircularGauge value={battery.soh} label="State of Health" unit="%" color="var(--color-green)" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { l: 'Voltage',    v: `${battery.voltage}`, u: 'V'   },
                { l: 'Current',    v: `${battery.current}`, u: 'A'   },
                { l: 'Temp',       v: `${battery.temp}`,    u: '°C'  },
                { l: 'Capacity',   v: `${battery.capacity}`,u: 'kWh' },
                { l: 'Cycle Count',v: `${battery.cycles}`,  u: 'cyc' },
                { l: 'Est. Runtime',v: `${((battery.soc / 100 * battery.capacity) / 2.1).toFixed(1)}`, u: 'hrs' },
              ].map(({ l, v, u }) => (
                <div key={l} className="bg-[var(--color-elevated)] rounded-md px-3 py-2">
                  <div className="text-[9px] font-display uppercase tracking-wide text-[var(--color-muted)]">{l}</div>
                  <div className="mono text-lg font-bold text-[var(--color-text)]">{v} <span className="text-xs text-[var(--color-muted)]">{u}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dispatch controls */}
        <div className="card p-4">
          <SectionLabel>Dispatch Mode</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="px-4 py-2 rounded-md text-xs font-display font-semibold border transition-all"
                style={mode === m.id
                  ? { borderColor: m.color, color: m.color, backgroundColor: m.color + '20' }
                  : { borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'transparent' }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-2 font-display">
            {mode === 'auto'      && 'Aurora Core manages dispatch based on solar forecast, price signals, and agent recommendations.'}
            {mode === 'charge'    && 'Force charging from grid or solar. Overrides agent recommendations.'}
            {mode === 'discharge' && 'Force discharging to support load. Useful during peak pricing events.'}
            {mode === 'hold'      && 'Hold current state of charge. No charge or discharge until mode changes.'}
          </p>
        </div>

        {/* SoC history */}
        <div className="card p-4">
          <SectionLabel>State of Charge · 24 Hours</SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={batterySocHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Share Tech Mono' }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-muted)', fontFamily: 'Share Tech Mono' }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }} />
              <Line type="monotone" dataKey="soc" name="SoC %" stroke="var(--color-cyan)"
                strokeWidth={2} dot={false}
                style={{ filter: 'drop-shadow(0 0 4px var(--color-cyan))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
