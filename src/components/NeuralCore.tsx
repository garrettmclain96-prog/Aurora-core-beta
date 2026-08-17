/**
 * NeuralCore — canvas-based visualization of Aurora's active intelligence.
 * Every number shown is DERIVED from live metrics. No hardcoded theater.
 * Agent orbs scale + glow based on their domain score.
 */
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LiveMetrics } from '../types'
import { useAuroraEngine } from '../hooks/useAuroraEngine'
import type { EngineState } from '../hooks/useAuroraEngine'

const AGENTS = [
  { name: 'HEALTH',      key: 'bio'    as const, color: '#ff3366', x: 0.5,  y: 0.09, icon: '♥' },
  { name: 'ENERGY',      key: 'energy' as const, color: '#ffd60a', x: 0.91, y: 0.5,  icon: '⚡' },
  { name: 'ENVIRONMENT', key: 'env'    as const, color: '#39ff14', x: 0.5,  y: 0.91, icon: '◈' },
  { name: 'BEHAVIOR',    key: 'bio'    as const, color: '#9b5de5', x: 0.09, y: 0.5,  icon: '◈' },
]

function getPtOnBezier(
  p0: {x:number;y:number}, p1: {x:number;y:number},
  p2: {x:number;y:number}, p3: {x:number;y:number}, t: number
) {
  const mt = 1 - t
  return {
    x: mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x,
    y: mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y,
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return '#39ff14'
  if (score >= 60) return '#00ffc8'
  if (score >= 40) return '#ffd60a'
  return '#ff3366'
}

export function NeuralCore({ metrics }: { metrics: LiveMetrics }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const timeRef   = useRef(0)
  const engineRef = useRef<EngineState | null>(null)
  const engine    = useAuroraEngine(metrics)

  // Keep engine state accessible in canvas loop
  useEffect(() => { engineRef.current = engine }, [engine])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width  = rect.width  * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      timeRef.current += 0.012
      const t = timeRef.current
      const W = canvas.width  / window.devicePixelRatio
      const H = canvas.height / window.devicePixelRatio
      const cx = W / 2, cy = H / 2

      const eng = engineRef.current
      const domainScores = eng?.domains ?? { energy: 80, bio: 75, env: 90 }
      const overallScore = eng?.score ?? 80

      ctx.clearRect(0, 0, W, H)

      const positions = AGENTS.map((a, i) => ({
        ...a,
        px: a.x * W,
        py: a.y * H,
        score: a.key === 'bio'
          ? domainScores.bio
          : a.key === 'energy' ? domainScores.energy : domainScores.env,
      }))

      // ── Neural links ─────────────────────────────────────────────
      positions.forEach((a, i) => {
        const wobble = Math.sin(t * 1.2 + i * 1.5) * 7
        const ctrl1x = cx + (a.px - cx) * 0.4 + wobble
        const ctrl1y = cy + (a.py - cy) * 0.4 - wobble
        const ctrl2x = cx + (a.px - cx) * 0.7 - wobble
        const ctrl2y = cy + (a.py - cy) * 0.7 + wobble

        // Link brightness driven by domain score
        const linkAlpha = Math.round(0.15 + (a.score / 100) * 0.45)
        const grad = ctx.createLinearGradient(cx, cy, a.px, a.py)
        grad.addColorStop(0, `#00ffc8${Math.round(linkAlpha * 255).toString(16).padStart(2,'0')}`)
        grad.addColorStop(1, a.color + Math.round(linkAlpha * 1.6 * 255).toString(16).padStart(2,'0').slice(0,2))
        ctx.beginPath(); ctx.moveTo(cx, cy)
        ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, a.px, a.py)
        ctx.strokeStyle = grad; ctx.lineWidth = 1 + (a.score / 100); ctx.stroke()

        // Filaments
        for (let f = 0; f < 2; f++) {
          const off = (f - 0.5) * 10
          ctx.beginPath(); ctx.moveTo(cx + off, cy)
          ctx.bezierCurveTo(ctrl1x + off, ctrl1y, ctrl2x, ctrl2y, a.px, a.py)
          ctx.strokeStyle = a.color + '12'; ctx.lineWidth = 0.5; ctx.stroke()
        }

        // Pulse speed driven by domain score — better score = faster pulses
        const speed = 0.2 + (a.score / 100) * 0.5
        for (let p = 0; p < 3; p++) {
          const progress = ((t * speed + p / 3 + i * 0.25) % 1)
          const pt = getPtOnBezier({x:cx,y:cy},{x:ctrl1x,y:ctrl1y},{x:ctrl2x,y:ctrl2y},{x:a.px,y:a.py}, progress)
          const size = 2 + (a.score / 100) * 1.5 + Math.sin(t * 3 + p) * 0.5
          ctx.beginPath(); ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2)
          ctx.fillStyle = a.color
          ctx.shadowBlur = 8 + (a.score / 100) * 6; ctx.shadowColor = a.color
          ctx.fill(); ctx.shadowBlur = 0
        }
      })

      // ── Cross-agent links ────────────────────────────────────────
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          ctx.beginPath()
          ctx.moveTo(positions[i].px, positions[i].py)
          ctx.lineTo(positions[j].px, positions[j].py)
          ctx.strokeStyle = '#00ffc408'; ctx.lineWidth = 0.5; ctx.stroke()
        }
      }

      // ── Central core ─────────────────────────────────────────────
      const coreR = Math.min(W, H) * 0.1
      const pulseFactor = 1 + Math.sin(t * 2) * 0.05
      const coreColor = scoreColor(overallScore)

      for (let ring = 4; ring >= 1; ring--) {
        ctx.beginPath()
        ctx.arc(cx, cy, coreR * pulseFactor * (1 + ring * 0.35), 0, Math.PI * 2)
        ctx.strokeStyle = `${coreColor}${Math.round((0.06 / ring) * 255).toString(16).padStart(2,'0')}`
        ctx.lineWidth = 1; ctx.stroke()
      }

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * pulseFactor)
      coreGrad.addColorStop(0, coreColor + '50')
      coreGrad.addColorStop(0.5, coreColor + '18')
      coreGrad.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(cx, cy, coreR * pulseFactor, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad; ctx.fill()

      ctx.beginPath(); ctx.arc(cx, cy, coreR * pulseFactor, 0, Math.PI * 2)
      ctx.strokeStyle = coreColor + 'a0'; ctx.lineWidth = 1.5
      ctx.shadowBlur = 20; ctx.shadowColor = coreColor; ctx.stroke(); ctx.shadowBlur = 0

      // Rotating hexagram
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        i === 0 ? ctx.moveTo(Math.cos(a)*coreR*0.5, Math.sin(a)*coreR*0.5)
                : ctx.lineTo(Math.cos(a)*coreR*0.5, Math.sin(a)*coreR*0.5)
      }
      ctx.closePath(); ctx.strokeStyle = coreColor + '40'; ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()

      // Score text in core
      ctx.font = `bold ${coreR * 0.55}px Syne`
      ctx.fillStyle = coreColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowBlur = 14; ctx.shadowColor = coreColor
      ctx.fillText(String(overallScore), cx, cy - 3); ctx.shadowBlur = 0
      ctx.font = `500 ${coreR * 0.19}px JetBrains Mono`
      ctx.fillStyle = '#4a7a8f'; ctx.fillText('SCORE', cx, cy + coreR * 0.45)

      // ── Agent orbs ── size/glow driven by domain score ───────────
      positions.forEach((a, i) => {
        const scoreRatio = a.score / 100
        const orbR = Math.min(W, H) * (0.07 + scoreRatio * 0.025)
        const orPulse = 1 + Math.sin(t * (1.2 + scoreRatio * 0.8) + i) * 0.05

        const orbGrad = ctx.createRadialGradient(a.px, a.py, 0, a.px, a.py, orbR * orPulse * 1.6)
        orbGrad.addColorStop(0, a.color + Math.round((0.2 + scoreRatio * 0.2) * 255).toString(16).padStart(2,'0').slice(0,2))
        orbGrad.addColorStop(1, 'transparent')
        ctx.beginPath(); ctx.arc(a.px, a.py, orbR * orPulse * 1.6, 0, Math.PI * 2)
        ctx.fillStyle = a.color + Math.round((0.12 + scoreRatio * 0.2) * 255).toString(16).padStart(2,'0').slice(0,2); ctx.fill()

        ctx.beginPath(); ctx.arc(a.px, a.py, orbR * orPulse, 0, Math.PI * 2)
        ctx.strokeStyle = a.color + Math.round((0.4 + scoreRatio * 0.4) * 255).toString(16).padStart(2,'0').slice(0,2)
        ctx.lineWidth = 1 + scoreRatio
        ctx.shadowBlur = 8 + scoreRatio * 16; ctx.shadowColor = a.color; ctx.stroke(); ctx.shadowBlur = 0

        // Rotating ring
        ctx.save(); ctx.translate(a.px, a.py); ctx.rotate(t * (i % 2 === 0 ? 0.4 : -0.3))
        ctx.beginPath(); ctx.arc(0, 0, orbR * 0.75, 0, Math.PI * 1.5 + scoreRatio * 0.5)
        ctx.strokeStyle = a.color + '50'; ctx.lineWidth = 1; ctx.stroke()
        ctx.restore()

        // Name
        ctx.font = `700 ${Math.min(W,H) * 0.022}px Syne`
        ctx.fillStyle = a.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowBlur = 8; ctx.shadowColor = a.color
        ctx.fillText(a.name, a.px, a.py); ctx.shadowBlur = 0

        // Score below name
        ctx.font = `500 ${Math.min(W,H) * 0.016}px JetBrains Mono`
        ctx.fillStyle = a.color + 'c0'
        ctx.fillText(`${a.score}`, a.px, a.py + orbR * 0.55)
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize) }
  }, [])

  // ── Stat overlay values — all derived from engine ────────────────
  const trend = engine.trend
  const trendColor = trend === 'improving' ? '#39ff14' : trend === 'degrading' ? '#ff3366' : '#00ffc8'
  const trendArrow = trend === 'improving' ? '↗' : trend === 'degrading' ? '↘' : '→'
  const msSinceDecision = Date.now() - engine.lastDecisionAt
  const latency = `${msSinceDecision < 1000 ? msSinceDecision : (msSinceDecision / 1000).toFixed(1) + 'k'} ms`

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* Top-left: domain scores — real */}
      <div className="absolute top-3 left-3 space-y-1">
        {[
          { l: 'ENERGY',  v: engine.domains.energy,  c: '#ffd60a' },
          { l: 'HEALTH',  v: engine.domains.bio,      c: '#ff3366' },
          { l: 'ENVIRON', v: engine.domains.env,      c: '#39ff14' },
        ].map(s => (
          <div key={s.l} className="flex items-center gap-1.5">
            <span className="mono text-[8px] text-[var(--color-dim)] tracking-wider w-14">{s.l}</span>
            <div className="h-1 w-12 rounded-full bg-[var(--color-border)] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: s.c }}
                animate={{ width: `${s.v}%` }} transition={{ duration: 0.8 }} />
            </div>
            <span className="mono text-[8px] font-bold w-6 text-right" style={{ color: s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Top-right: trend + prediction — real */}
      <div className="absolute top-3 right-3 space-y-1 text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="mono text-[9px] font-bold" style={{ color: trendColor }}>{trendArrow} {trend.toUpperCase()}</span>
          <span className="mono text-[8px] text-[var(--color-dim)]">TREND</span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className="mono text-[8px] font-bold text-[var(--color-text)]">{engine.predictedScore}</span>
          <span className="mono text-[8px] text-[var(--color-dim)]">PREDICTED</span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className="mono text-[8px] font-bold text-[#00ffc8]">{engine.decisionsTotal.toLocaleString()}</span>
          <span className="mono text-[8px] text-[var(--color-dim)]">DECISIONS</span>
        </div>
      </div>

      {/* Bottom-left: live signals — real */}
      <div className="absolute bottom-3 left-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="mono text-[8px] text-[var(--color-dim)] tracking-wider">ACTIVE SIGNALS</span>
          <span className="mono text-[8px] font-bold text-[#00ffc8]">{engine.signals.length}</span>
        </div>
        <AnimatePresence mode="popLayout">
          {engine.signals.slice(0, 3).map(sig => (
            <motion.div key={sig.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                backgroundColor: sig.severity === 'alert' ? '#ff3366' : sig.severity === 'warn' ? '#ffd60a' : '#00ffc8',
                boxShadow: `0 0 4px ${sig.severity === 'alert' ? '#ff3366' : '#ffd60a'}`
              }} />
              <span className="mono text-[8px] text-[var(--color-muted)] truncate max-w-[140px]">{sig.message}</span>
            </motion.div>
          ))}
          {engine.signals.length === 0 && (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14]" style={{ boxShadow: '0 0 4px #39ff14' }} />
              <span className="mono text-[8px] text-[var(--color-dim)]">All systems nominal</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-right: live sensor summary — real */}
      <div className="absolute bottom-3 right-3 space-y-1 text-right">
        {[
          { l: 'SOLAR',   v: `${metrics.solar} kW`,       c: '#39ff14' },
          { l: 'HR',      v: `${metrics.heartRate} bpm`,   c: '#ff3366' },
          { l: 'CO₂',     v: `${metrics.co2} ppm`,         c: metrics.co2 > 1000 ? '#ff3366' : '#00ffc8' },
          { l: 'BATTERY', v: `${metrics.batterySoc.toFixed(0)}%`, c: '#00ffc8' },
        ].map(s => (
          <div key={s.l} className="flex items-center gap-1.5 justify-end">
            <span className="mono text-[8px] font-bold" style={{ color: s.c }}>{s.v}</span>
            <span className="mono text-[8px] text-[var(--color-dim)] w-10">{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
