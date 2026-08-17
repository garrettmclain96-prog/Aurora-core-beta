/**
 * ScoreHistoryChart — live rolling score + domain breakdown sparklines
 * Uses Recharts. Keeps last 60 ticks in memory.
 */
import { useEffect, useRef, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from 'recharts'
import { motion } from 'framer-motion'
import type { LiveMetrics } from '../types'
import { calcSystemScore } from '../utils/biometrics'

interface Point {
  tick:  number
  score: number
  energy: number
  bio:    number
  env:    number
  ts:     string
}

function calcDomainScores(m: LiveMetrics) {
  // Mirror scoring.ts heuristics for the demo layer
  const coverage  = m.load > 0 ? Math.min(1, m.solar / m.load) : 1
  const battery   = m.batterySoc / 100
  const tariff    = 0.8  // assumed off-peak
  const energy    = Math.round(Math.max(0, Math.min(100, coverage * 48 + battery * 28 + tariff * 20 + 4)))

  const hrPenalty  = m.heartRate > 100 ? (m.heartRate - 100) * 1.2 : m.heartRate < 50 ? (50 - m.heartRate) * 1.2 : 0
  const hrvBonus   = m.hrv > 60 ? Math.min(5, (m.hrv - 60) * 0.2) : 0
  const hrvPenalty = m.hrv < 40 ? (40 - m.hrv) * 1.5 : 0
  const bio        = Math.round(Math.max(0, Math.min(100, 100 - hrPenalty + hrvBonus - hrvPenalty - m.stress * 0.4)))

  // temp in °F → °C approx
  const tempC  = (m.temp - 32) / 1.8
  const tempS  = tempC < 18 || tempC > 26 ? 70 : 100
  const humS   = m.humidity < 30 || m.humidity > 60 ? 70 : 100
  const co2S   = m.co2 > 1500 ? 30 : m.co2 > 1000 ? 65 : m.co2 > 800 ? 85 : 100
  const pmS    = m.pm25 > 35 ? 30 : m.pm25 > 15 ? 70 : 100
  const env    = Math.round((tempS + humS + co2S + pmS) / 4)

  return { energy, bio, env }
}

const MAX_POINTS = 60

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: Point }>
  label?: string
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as Point
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 shadow-xl">
      <div className="mono text-[9px] text-[var(--color-muted)] mb-1">{d.ts}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {[
          { l: 'Score',  v: d.score,  c: '#9b5de5' },
          { l: 'Energy', v: d.energy, c: '#00ffc8' },
          { l: 'Bio',    v: d.bio,    c: '#ff3366' },
          { l: 'Env',    v: d.env,    c: '#ffd60a' },
        ].map(r => (
          <div key={r.l} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.c }} />
            <span className="mono text-[9px] text-[var(--color-muted)]">{r.l}</span>
            <span className="mono text-[9px] font-bold ml-auto" style={{ color: r.c }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScoreHistoryChart({ metrics }: { metrics: LiveMetrics }) {
  const [data, setData]   = useState<Point[]>([])
  const tickRef           = useRef(0)

  useEffect(() => {
    const { energy, bio, env } = calcDomainScores(metrics)
    const score = calcSystemScore(metrics.hrv, metrics.stress, metrics.batterySoc, metrics.solar, metrics.co2)
    const point: Point = {
      tick:   tickRef.current++,
      score,
      energy,
      bio,
      env,
      ts:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
    setData(prev => [...prev.slice(-(MAX_POINTS - 1)), point])
  }, [metrics.tick])

  const latest = data[data.length - 1]
  const trend  = data.length >= 3
    ? data[data.length - 1].score > data[data.length - 3].score ? 'improving'
    : data[data.length - 1].score < data[data.length - 3].score ? 'degrading' : 'stable'
    : 'stable'

  const trendColor = trend === 'improving' ? '#39ff14' : trend === 'degrading' ? '#ff3366' : '#00ffc8'
  const trendArrow = trend === 'improving' ? '↗' : trend === 'degrading' ? '↘' : '→'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div>
          <div className="display font-bold text-xs text-[var(--color-text)]">System Score · Live</div>
          <div className="mono text-[9px] text-[var(--color-muted)]">last {Math.min(data.length, MAX_POINTS)} ticks</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { l: 'Score',  c: '#9b5de5' },
              { l: 'Energy', c: '#00ffc8' },
              { l: 'Bio',    c: '#ff3366' },
              { l: 'Env',    c: '#ffd60a' },
            ].map(r => (
              <div key={r.l} className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.c }} />
                <span className="mono text-[8px] text-[var(--color-dim)]">{r.l}</span>
              </div>
            ))}
          </div>
          {latest && (
            <div className="flex items-center gap-1">
              <span className="display font-black text-sm" style={{ color: trendColor }}>
                {latest.score}
              </span>
              <span className="mono text-[10px]" style={{ color: trendColor }}>{trendArrow}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-3" style={{ height: 160 }}>
        {data.length < 2 ? (
          <div className="h-full flex items-center justify-center">
            <span className="mono text-[10px] text-[var(--color-dim)] animate-pulse">Collecting data…</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                {[
                  { id: 'score',  c: '#9b5de5' },
                  { id: 'energy', c: '#00ffc8' },
                  { id: 'bio',    c: '#ff3366' },
                  { id: 'env',    c: '#ffd60a' },
                ].map(g => (
                  <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={g.c} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={g.c} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="tick" hide />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-dim)', fontSize: 8, fontFamily: 'JetBrains Mono' }} tickCount={5} />
              <ReferenceLine y={75} stroke="#39ff1430" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="#ffd60a30" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="energy" stroke="#00ffc8" strokeWidth={1}   fill="url(#grad-energy)" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="bio"    stroke="#ff3366" strokeWidth={1}   fill="url(#grad-bio)"    dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="env"    stroke="#ffd60a" strokeWidth={1}   fill="url(#grad-env)"    dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="score"  stroke="#9b5de5" strokeWidth={2}   fill="url(#grad-score)"  dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
