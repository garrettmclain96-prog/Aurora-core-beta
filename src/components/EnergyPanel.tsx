/**
 * EnergyPanel — real-time energy data.
 * Chart builds from live metrics every tick — no static seed data.
 */
import { useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import type { LiveMetrics } from '../types'
import { calcEnergySavings, calcSelfSufficiency } from '../utils/energy'

interface HistoryPoint { label: string; solar: number; load: number; grid: number }

function FlowBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="mono text-[9px] text-[var(--color-muted)] tracking-wider">{label}</span>
        <span className="mono text-[10px] font-bold" style={{ color }}>{value} {unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  )
}

const MAX_HISTORY = 48

export function EnergyPanel({ metrics }: { metrics: LiveMetrics }) {
  const { solar, load, grid, batterySoc, batteryCurrent } = metrics
  const historyRef = useRef<HistoryPoint[]>([])

  // Build rolling history from live ticks
  useEffect(() => {
    const ts = new Date()
    const label = `${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}:${String(ts.getSeconds()).padStart(2,'0')}`
    historyRef.current = [
      ...historyRef.current.slice(-(MAX_HISTORY - 1)),
      { label, solar: +solar.toFixed(2), load: +load.toFixed(2), grid: +grid.toFixed(2) },
    ]
  }, [metrics.tick, solar, load, grid])

  const isCharging  = batteryCurrent > 0
  const selfSuff    = calcSelfSufficiency(solar, load)
  const savingsHr   = +(solar * 0.14).toFixed(2)  // $/hr at $0.14/kWh
  const history     = historyRef.current

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[#ffd60a] text-sm">⚡</span>
        <span className="display font-black text-sm text-[#ffd60a]" style={{ textShadow: '0 0 12px #ffd60a80' }}>ENERGY</span>
        <span className="mono text-[9px] px-1.5 py-0.5 rounded border border-[#ffd60a20] text-[#ffd60a60]">{selfSuff}% solar</span>
        <span className="mono text-[9px] text-[var(--color-muted)] ml-auto">LIVE</span>
        <span className="status-dot pulse-dot" style={{ backgroundColor: '#ffd60a', width: 5, height: 5 }} />
      </div>

      {/* Three key numbers */}
      <div className="grid grid-cols-3 gap-2 flex-shrink-0">
        {[
          { l: 'SOLAR',   v: solar,              u: 'kW', c: '#39ff14', icon: '☀️' },
          { l: 'BATTERY', v: batterySoc,          u: '%',  c: '#00ffc8', icon: '🔋' },
          { l: 'GRID',    v: grid.toFixed(2),     u: 'kW', c: '#ffd60a', icon: '⚡' },
        ].map(item => (
          <div key={item.l} className="card p-2.5 text-center" style={{ borderColor: item.c + '30', background: item.c + '08' }}>
            <div className="text-base mb-1">{item.icon}</div>
            <motion.div key={String(item.v)} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
              className="mono font-black text-lg leading-none" style={{ color: item.c, textShadow: `0 0 8px ${item.c}60` }}>
              {item.v}
            </motion.div>
            <div className="mono text-[8px] text-[var(--color-muted)] mt-0.5">{item.u}</div>
            <div className="mono text-[7px] tracking-widest text-[var(--color-dim)] uppercase mt-0.5">{item.l}</div>
          </div>
        ))}
      </div>

      {/* Flow bars */}
      <div className="card p-3 flex-shrink-0 space-y-2.5" style={{ borderColor: '#ffd60a18' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-1">Power Flow</div>
        <FlowBar label="Solar Generation" value={solar}      max={6}   color="#39ff14" unit="kW" />
        <FlowBar label="Total Load"       value={load}       max={15}  color="#ffd60a" unit="kW" />
        <FlowBar label="Battery SoC"      value={batterySoc} max={100} color="#00ffc8" unit="%"  />
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          <span className="mono text-[8px]" style={{ color: isCharging ? '#39ff14' : '#ffd60a' }}>
            {isCharging ? '▲ CHARGING' : '▼ DISCHARGING'} {Math.abs(batteryCurrent).toFixed(1)}A
          </span>
          <span className="mono text-[8px] text-[#39ff14]">+${savingsHr}/hr solar</span>
        </div>
      </div>

      {/* Live rolling chart */}
      <div className="card p-3 flex-1 flex flex-col min-h-0" style={{ borderColor: '#ffd60a18' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-2">
          Live Energy Flow
          {history.length < 3 && <span className="ml-2 text-[var(--color-dim)]">— collecting…</span>}
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
              <defs>
                {[['s','#39ff14'],['l','#ffd60a']].map(([id,c]) => (
                  <linearGradient key={id} id={`ep2-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={c} stopOpacity={0}   />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#5a8a9f', fontFamily: 'JetBrains Mono' }} interval={Math.max(1, Math.floor(history.length / 6))} />
              <YAxis tick={{ fontSize: 7, fill: '#5a8a9f', fontFamily: 'JetBrains Mono' }} />
              <Tooltip contentStyle={{ background: 'rgba(9,18,25,0.95)', border: '1px solid #132030', borderRadius: 8, fontSize: 10 }} />
              <Area type="monotone" dataKey="solar" name="Solar" stroke="#39ff14" fill="url(#ep2-s)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="load"  name="Load"  stroke="#ffd60a" fill="url(#ep2-l)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
