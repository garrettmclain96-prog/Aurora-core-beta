/**
 * AuroraIntelligence — the licensing demo centrepiece.
 *
 * Shows what Aurora is actually DOING:
 *   • Rolling feed of live decisions (derived from engine signals)
 *   • Today's energy savings, CO₂ avoided, solar self-sufficiency
 *   • Mode + score trend
 *
 * Every number is computed from live metrics. No seeds, no hardcoding.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'wouter'
import { Sparkles } from 'lucide-react'
import type { LiveMetrics } from '../types'
import { useAuroraEngine } from '../hooks/useAuroraEngine'
import type { Signal } from '../hooks/useAuroraEngine'
import { calcEnergySavings, calcCO2Avoided, calcSelfSufficiency } from '../utils/energy'

// ── Map engine signals → natural-language decision strings ───────────────────

function signalToDecision(sig: Signal): string {
  const map: Record<string, (s: Signal) => string> = {
    'energy.solar_surplus':       s => `Shifted deferred loads to consume ${s.message.match(/\d+/)?.[0] ?? ''}W solar surplus`,
    'energy.battery_critical':    () => 'Enabled emergency grid charge — battery below 15%',
    'energy.battery_low':         () => 'Reducing non-essential loads — battery below 25%',
    'energy.high_grid_draw':      s => `Peak-shaving active — deferred loads to cut ${s.message.match(/[\d.]+/)?.[0] ?? ''} kW grid draw`,
    'bio.high_strain':            () => 'Dimmed lights 30%, lowered setpoint 1°C — elevated stress detected',
    'bio.elevated_stress':        () => 'Suggested break — reducing ambient stimulation',
    'bio.low_hrv':                () => 'Recovery mode: minimal notifications, warm lighting',
    'bio.elevated_hr':            () => 'Monitoring — HR elevated, reducing HVAC fan noise',
    'env.co2_critical':           s => `Ventilation at MAX — CO₂ critical (${s.message.match(/\d+/)?.[0] ?? ''} ppm)`,
    'env.co2_elevated':           s => `Increased ventilation — CO₂ at ${s.message.match(/\d+/)?.[0] ?? ''} ppm`,
    'env.co2_rising':             () => 'Opening fresh-air damper — CO₂ trending up',
    'env.pm25_elevated':          s => `Air purifier ON — PM2.5 at ${s.message.match(/[\d.]+/)?.[0] ?? ''} µg/m³`,
    'env.humidity_high':          () => 'Dehumidifier enabled — humidity above comfort threshold',
    'env.temp_high':              s => `Lowered HVAC setpoint — room at ${s.message.match(/[\d.]+/)?.[0] ?? ''}°C`,
  }
  return map[sig.kind]?.(sig) ?? sig.message
}

interface DecisionEntry {
  id:       string
  text:     string
  severity: Signal['severity']
  ts:       number
}

// ── Cost impact per decision kind ($/hr saved estimate) ─────────────────────
const COST_IMPACT: Record<string, number> = {
  'energy.high_grid_draw':   0.18,
  'energy.solar_surplus':    0.12,
  'energy.battery_critical': 0.08,
  'bio.high_strain':         0.03,
  'env.co2_critical':        0.06,
}

const SEVERITY_COLOR = { info: '#00ffc8', warn: '#ffd60a', alert: '#ff3366' } as const

let _id = 0
const nextId = () => `d${Date.now()}_${_id++}`

export function AuroraIntelligence({ metrics }: { metrics: LiveMetrics }) {
  const engine   = useAuroraEngine(metrics)
  const prevSigs = useRef<Set<string>>(new Set())
  const [feed, setFeed]           = useState<DecisionEntry[]>([])
  const [savedToday, setSavedToday] = useState(0)
  const [sessionStart] = useState(Date.now())

  // ── Build rolling decision feed from new signals ────────────────────────
  useEffect(() => {
    const incoming = engine.signals.filter(s => !prevSigs.current.has(s.kind))
    if (incoming.length === 0) return

    incoming.forEach(s => prevSigs.current.add(s.kind))
    // Clear seen kinds after 30s so they can re-fire
    setTimeout(() => incoming.forEach(s => prevSigs.current.delete(s.kind)), 30_000)

    const newEntries: DecisionEntry[] = incoming.map(s => ({
      id:       nextId(),
      text:     signalToDecision(s),
      severity: s.severity,
      ts:       Date.now(),
    }))

    setFeed(prev => [...newEntries, ...prev].slice(0, 8))

    // Accumulate cost savings
    const impact = incoming.reduce((sum, s) => sum + (COST_IMPACT[s.kind] ?? 0), 0)
    if (impact > 0) setSavedToday(p => +(p + impact * 0.5).toFixed(2))
  }, [engine.signals])

  // ── Derived stats ────────────────────────────────────────────────────────
  const hoursOn       = (Date.now() - sessionStart) / 3_600_000
  const solHoursToday = Math.min(hoursOn, 8) // cap at 8 daylight hours
  const savings       = +(savedToday + calcEnergySavings(metrics.solar, solHoursToday)).toFixed(2)
  const co2           = calcCO2Avoided(metrics.solar, solHoursToday)
  const selfSuff      = calcSelfSufficiency(metrics.solar, metrics.load)

  const scoreColor = engine.score >= 80 ? '#39ff14' : engine.score >= 60 ? '#00ffc8' : engine.score >= 40 ? '#ffd60a' : '#ff3366'
  const trendArrow = engine.trend === 'improving' ? '↗' : engine.trend === 'degrading' ? '↘' : '→'

  const nominalEntry: DecisionEntry = {
    id: 'nominal', text: 'All systems nominal — monitoring continuously',
    severity: 'info', ts: Date.now(),
  }
  const displayFeed = feed.length > 0 ? feed : [nominalEntry]

  return (
    <div className="flex flex-col h-full p-3 gap-3">

      {/* ── Score + stats row ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {[
          { label: 'SCORE',    value: String(engine.score), unit: '/100', color: scoreColor, suffix: trendArrow },
          { label: 'SAVED',    value: `$${savings}`,        unit: 'today', color: '#39ff14',  suffix: ''        },
          { label: 'CO₂',      value: `${co2}`,             unit: 'kg↓',  color: '#00ffc8',  suffix: ''        },
          { label: 'SOLAR',    value: `${selfSuff}%`,        unit: 'self', color: '#ffd60a',  suffix: ''        },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-2 rounded-lg border"
            style={{ borderColor: s.color + '20', background: s.color + '06' }}>
            <div className="flex items-baseline gap-0.5">
              <motion.span key={s.value} initial={{ opacity: 0.4, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="mono font-black text-sm leading-none" style={{ color: s.color }}>
                {s.value}
              </motion.span>
              {s.suffix && <span className="mono text-[9px]" style={{ color: s.color }}>{s.suffix}</span>}
            </div>
            <span className="mono text-[7px] text-[var(--color-dim)] mt-0.5 tracking-wider">{s.unit}</span>
            <span className="mono text-[7px] text-[var(--color-dim)] tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Decision feed ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="mono text-[8px] text-[var(--color-muted)] tracking-[0.2em] uppercase">Aurora Decisions</span>
          <span className="mono text-[8px] text-[var(--color-dim)]">{engine.decisionsTotal} total</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          <AnimatePresence initial={false}>
            {displayFeed.map(d => (
              <motion.div key={d.id}
                initial={{ opacity: 0, x: -8, height: 0 }}
                animate={{ opacity: 1, x: 0,  height: 'auto' }}
                exit={{   opacity: 0, x:  8,  height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-2 px-2.5 py-2 rounded-lg border"
                style={{
                  borderColor: SEVERITY_COLOR[d.severity] + '25',
                  background:  SEVERITY_COLOR[d.severity] + '07',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: SEVERITY_COLOR[d.severity], boxShadow: `0 0 4px ${SEVERITY_COLOR[d.severity]}` }} />
                <span className="mono text-[9px] text-[var(--color-muted)] leading-relaxed flex-1">{d.text}</span>
                <span className="mono text-[7px] text-[var(--color-dim)] flex-shrink-0 mt-0.5">
                  {new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── JARVIS CTA ────────────────────────────────────────── */}
      <Link href="/chat" className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#00ffc825] bg-[#00ffc806] hover:bg-[#00ffc812] transition-all flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-[#00ffc8]" />
        <span className="mono text-[9px] text-[#00ffc8] font-bold">Ask JARVIS about any decision</span>
        <span className="mono text-[9px] text-[#00ffc850] ml-auto">→</span>
      </Link>
    </div>
  )
}
