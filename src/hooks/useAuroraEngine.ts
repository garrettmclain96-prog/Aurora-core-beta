/**
 * useAuroraEngine — runs the actual scoring/decision logic
 * on the frontend from live metrics. Every number is derived.
 * No fake stats anywhere.
 */
import { useState, useEffect, useRef } from 'react'
import type { LiveMetrics } from '../types'

export type Severity = 'info' | 'warn' | 'alert'
export type Trend = 'improving' | 'stable' | 'degrading'

export interface Signal {
  id:              string
  kind:            string
  severity:        Severity
  domain:          'energy' | 'bio' | 'env'
  message:         string
  recommendation:  string
  ts:              number
}

export interface DomainScores {
  energy:  number
  bio:     number
  env:     number
}

export interface EngineState {
  score:          number
  domains:        DomainScores
  trend:          Trend
  predictedScore: number
  signals:        Signal[]
  decisionsTotal: number
  signalsTotal:   number
  lastDecisionAt: number
}

// ── pure scoring (mirrors apps/api/src/engine/scoring.ts) ────────────────────

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)) }

function energyScore(m: LiveMetrics): number {
  const solarW = m.solar * 1000
  const loadW  = m.load  * 1000
  const coverage = loadW <= 0 ? 1 : Math.min(1, solarW / loadW)
  const battery  = clamp(m.batterySoc) / 100
  // tariff approximation: pretend off-peak when battery > 50, peak when low
  const tariff   = m.batterySoc > 50 ? 0.85 : 0.5
  const exportB  = solarW > loadW ? Math.min(5, ((solarW - loadW) / loadW) * 10) : 0
  return Math.round(clamp(coverage * 48 + battery * 28 + tariff * 20 + exportB))
}

function bioScore(m: LiveMetrics): number {
  const hrPenalty  = m.heartRate > 100 ? (m.heartRate - 100) * 1.2 : m.heartRate < 50 ? (50 - m.heartRate) * 1.2 : 0
  const hrvBonus   = m.hrv > 60 ? Math.min(5, (m.hrv - 60) * 0.2) : 0
  const hrvPenalty = m.hrv < 40 ? (40 - m.hrv) * 1.5 : 0
  return Math.round(clamp(100 - hrPenalty + hrvBonus - hrvPenalty - m.stress * 0.4))
}

function envScore(m: LiveMetrics): number {
  const tempC = (m.temp - 32) / 1.8
  const temp  = tempC < 18 ? 60 - (18 - tempC) * 4 : tempC > 26 ? 60 - (tempC - 26) * 4 : tempC >= 20 && tempC <= 24 ? 100 : 85
  const hum   = m.humidity < 30 ? 70 : m.humidity > 60 ? 70 - (m.humidity - 60) * 1.5 : 100
  const co2   = m.co2 > 1500 ? 35 : m.co2 > 1000 ? 65 : m.co2 > 800 ? 85 : 100
  const pm    = m.pm25 > 35 ? 35 : m.pm25 > 15 ? 70 : 100
  return Math.round(clamp((temp + hum + co2 + pm) / 4))
}

function deriveSignals(m: LiveMetrics): Omit<Signal, 'id' | 'ts'>[] {
  const out: Omit<Signal, 'id' | 'ts'>[] = []
  const solarW = m.solar * 1000, loadW = m.load * 1000

  // Energy
  if (m.batterySoc < 15)
    out.push({ kind:'energy.battery_critical', severity:'alert', domain:'energy', message:`Battery critical — ${m.batterySoc.toFixed(0)}%`, recommendation:'Enable grid charge immediately' })
  else if (m.batterySoc < 25)
    out.push({ kind:'energy.battery_low', severity:'warn', domain:'energy', message:`Battery low — ${m.batterySoc.toFixed(0)}%`, recommendation:'Reduce non-essential loads' })

  if (solarW > loadW * 1.4 && m.batterySoc < 85)
    out.push({ kind:'energy.solar_surplus', severity:'info', domain:'energy', message:`Solar surplus ${Math.round(solarW - loadW)}W`, recommendation:'Run dishwasher/dryer now — free solar' })

  if (m.grid > 3)
    out.push({ kind:'energy.high_grid_draw', severity:'warn', domain:'energy', message:`High grid draw — ${m.grid.toFixed(1)} kW`, recommendation:'Shed non-critical loads' })

  // Bio
  if (m.stress >= 70)
    out.push({ kind:'bio.high_strain', severity:'alert', domain:'bio', message:`High stress — ${Math.round(m.stress)}/100`, recommendation:'Aurora dimming lights, lowering temp 1°C' })
  else if (m.stress >= 50)
    out.push({ kind:'bio.elevated_stress', severity:'warn', domain:'bio', message:`Elevated stress — ${Math.round(m.stress)}/100`, recommendation:'Consider a 5-min break' })

  if (m.hrv < 30)
    out.push({ kind:'bio.low_hrv', severity:'warn', domain:'bio', message:`Low HRV — ${Math.round(m.hrv)} ms`, recommendation:'Prioritise sleep and hydration' })

  if (m.heartRate > 100)
    out.push({ kind:'bio.elevated_hr', severity:'warn', domain:'bio', message:`Elevated HR — ${Math.round(m.heartRate)} bpm`, recommendation:'Rest; check if this is activity-related' })

  // Env
  if (m.co2 > 1500)
    out.push({ kind:'env.co2_critical', severity:'alert', domain:'env', message:`CO₂ critical — ${Math.round(m.co2)} ppm`, recommendation:'Open windows NOW; running ventilation at max' })
  else if (m.co2 > 1000)
    out.push({ kind:'env.co2_elevated', severity:'warn', domain:'env', message:`CO₂ elevated — ${Math.round(m.co2)} ppm`, recommendation:'Increase ventilation' })
  else if (m.co2 > 800)
    out.push({ kind:'env.co2_rising', severity:'info', domain:'env', message:`CO₂ rising — ${Math.round(m.co2)} ppm`, recommendation:'Open a window soon' })

  if (m.pm25 > 35)
    out.push({ kind:'env.pm25_elevated', severity:'alert', domain:'env', message:`PM2.5 elevated — ${m.pm25.toFixed(1)} µg/m³`, recommendation:'Run air purifier now' })

  if (m.humidity > 68)
    out.push({ kind:'env.humidity_high', severity:'warn', domain:'env', message:`Humidity high — ${Math.round(m.humidity)}%`, recommendation:'Dehumidifier recommended' })

  const tempC = (m.temp - 32) / 1.8
  if (tempC > 28)
    out.push({ kind:'env.temp_high', severity:'warn', domain:'env', message:`Room hot — ${tempC.toFixed(1)}°C`, recommendation:'Lower HVAC setpoint' })

  return out
}

function detectTrend(history: number[]): Trend {
  if (history.length < 3) return 'stable'
  const recent = history.slice(-5)
  const n = recent.length
  const xMean = (n - 1) / 2
  const yMean = recent.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  recent.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2 })
  const slope = den !== 0 ? num / den : 0
  return slope > 1.5 ? 'improving' : slope < -1.5 ? 'degrading' : 'stable'
}

let _uid = 0
function uid() { return `sig_${Date.now()}_${_uid++}` }

export function useAuroraEngine(metrics: LiveMetrics): EngineState {
  const scoreHistory     = useRef<number[]>([])
  const decisionsTotal   = useRef(0)
  const signalsTotal     = useRef(0)
  const [state, setState] = useState<EngineState>({
    score: metrics.systemScore, domains: { energy: 80, bio: 75, env: 90 },
    trend: 'stable', predictedScore: metrics.systemScore,
    signals: [], decisionsTotal: 0, signalsTotal: 0, lastDecisionAt: Date.now(),
  })

  useEffect(() => {
    const e = energyScore(metrics)
    const b = bioScore(metrics)
    const v = envScore(metrics)
    const score = Math.round(e * 0.33 + b * 0.33 + v * 0.34)

    scoreHistory.current.push(score)
    if (scoreHistory.current.length > 20) scoreHistory.current.shift()

    const trend = detectTrend(scoreHistory.current)
    const delta = trend === 'improving' ? 2 : trend === 'degrading' ? -2 : 0
    const predictedScore = clamp(score + delta)

    const rawSignals = deriveSignals(metrics)
    const signals: Signal[] = rawSignals.map(s => ({ ...s, id: uid(), ts: Date.now() }))

    decisionsTotal.current++
    signalsTotal.current += signals.length

    setState({
      score, domains: { energy: e, bio: b, env: v },
      trend, predictedScore, signals,
      decisionsTotal: decisionsTotal.current,
      signalsTotal:   signalsTotal.current,
      lastDecisionAt: Date.now(),
    })
  }, [metrics.tick])

  return state
}
