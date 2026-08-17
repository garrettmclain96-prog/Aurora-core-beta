import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import type { LiveMetrics } from '../types'

const WEEK_DATA = [
  { day: 'M', score: 72 }, { day: 'T', score: 85 }, { day: 'W', score: 61 },
  { day: 'T', score: 90 }, { day: 'F', score: 78 }, { day: 'S', score: 83 }, { day: 'S', score: 69 },
]

const PATTERNS = [
  { l: 'Context',     v: '3.2pm', trend: '↑' },
  { l: 'Diagnostics', v: '1.3%',  trend: '→' },
  { l: 'Learning',    v: '18.5%', trend: '↑' },
  { l: 'Sorties',     v: '1.9pm', trend: '↓' },
]

function CircleScore({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 28, circ = 2 * Math.PI * r, fill = circ * (value / 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="#132030" strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={36} y={36} textAnchor="middle" dominantBaseline="middle"
          fontSize={16} fontFamily="JetBrains Mono" fontWeight="700" fill={color}>{value}</text>
        <text x={36} y={50} textAnchor="middle" dominantBaseline="middle"
          fontSize={7} fontFamily="JetBrains Mono" fill="#5a8a9f">{label}</text>
      </svg>
    </div>
  )
}

export function BehaviorPanel({ metrics }: { metrics: LiveMetrics }) {
  const wellnessScore = Math.round((metrics.hrv / 60) * 40 + (1 - metrics.stress / 100) * 60)
  const meditationScore = Math.round(72 + Math.sin(Date.now() / 10000) * 5)

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[#9b5de5] text-sm">◈</span>
        <span className="display font-black text-sm text-[#9b5de5]" style={{ textShadow: '0 0 12px #9b5de580' }}>BEHAVIOR</span>
        <span className="mono text-[9px] text-[var(--color-muted)] ml-auto">LIVE</span>
        <span className="status-dot pulse-dot" style={{ backgroundColor: '#9b5de5', width: 5, height: 5 }} />
      </div>

      {/* Activity summary header */}
      <div className="card p-3 flex-shrink-0" style={{ borderColor: '#9b5de525' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-2">Activity Summary</div>
        <div className="flex items-center gap-4">
          {/* Weekly bar chart */}
          <div className="flex-1" style={{ height: 52 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEK_DATA} margin={{ top: 2, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 7, fill: '#5a8a9f', fontFamily: 'JetBrains Mono' }} />
                <YAxis hide />
                <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                  {WEEK_DATA.map((_, i) => (
                    <Cell key={i} fill={i === 6 ? '#9b5de5' : '#9b5de540'}
                      style={{ filter: i === 6 ? 'drop-shadow(0 0 4px #9b5de5)' : 'none' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <CircleScore value={wellnessScore} color="#9b5de5" label="WELLNESS" />
        </div>
      </div>

      {/* Pattern data */}
      <div className="card p-3 flex-shrink-0" style={{ borderColor: '#9b5de518' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-2">Pattern Recognition</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {PATTERNS.map(p => (
            <div key={p.l} className="flex items-center justify-between">
              <span className="mono text-[9px] text-[var(--color-muted)]">{p.l}</span>
              <div className="flex items-center gap-1">
                <span className="mono text-[9px] font-bold text-[#9b5de5]">{p.v}</span>
                <span className="mono text-[8px]" style={{ color: p.trend === '↑' ? '#39ff14' : p.trend === '↓' ? '#ff3366' : '#5a8a9f' }}>{p.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meditation score */}
      <div className="card p-3 flex-1" style={{ borderColor: '#9b5de518' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-2">Meditation Score</div>
        <div className="flex items-center gap-3 mb-3">
          <CircleScore value={meditationScore} color="#9b5de5" label="SCORE" />
          <div className="flex-1">
            <div className="mono text-[10px] text-[var(--color-text)] leading-relaxed">
              Consider a 10 min breathing session this evening
            </div>
            <div className="mono text-[8px] text-[var(--color-muted)] mt-1">Based on HRV trend + stress index</div>
          </div>
        </div>
        {/* Learned patterns */}
        <div className="space-y-1.5">
          <div className="mono text-[8px] text-[var(--color-dim)] tracking-wider uppercase">Learned Patterns · 24 active</div>
          {[
            { l: 'Wake preference',    v: '06:15',    c: '#9b5de5' },
            { l: 'Peak focus window',  v: '09-11am',  c: '#00ffc8' },
            { l: 'Comfort temp',       v: '72–74°F',  c: '#ffd60a' },
          ].map(p => (
            <div key={p.l} className="flex items-center justify-between">
              <span className="mono text-[9px] text-[var(--color-muted)]">{p.l}</span>
              <span className="mono text-[9px] font-bold" style={{ color: p.c }}>{p.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
