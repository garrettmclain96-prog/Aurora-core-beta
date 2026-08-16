import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { LiveMetrics } from '../lib/useRealtime'

function Arc({ value, max = 100, color, size, strokeWidth, startAngle, sweepAngle, label, sublabel }: {
  value: number; max?: number; color: string; size: number; strokeWidth: number
  startAngle: number; sweepAngle: number; label: string; sublabel: string
}) {
  const r = (size - strokeWidth) / 2
  const cx = size / 2, cy = size / 2
  const pct = Math.min(value / max, 1)
  const totalArc = (sweepAngle / 360) * 2 * Math.PI * r
  const fillArc  = totalArc * pct

  const polarToXY = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  const describeArc = (start: number, sweep: number) => {
    const s = polarToXY(start), e = polarToXY(start + sweep)
    const large = sweep > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <g>
      <path d={describeArc(startAngle, sweepAngle)} fill="none" stroke="var(--color-elevated)" strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d={describeArc(startAngle, sweepAngle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={`${fillArc} ${totalArc}`}
        style={{ filter: `drop-shadow(0 0 5px ${color}80)`, transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cy - 20} textAnchor="middle" fontSize={8} fontFamily="Exo 2" fill="var(--color-muted)">{label}</text>
      <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={9} fontFamily="Share Tech Mono" fontWeight="bold" fill={color}>{sublabel}</text>
    </g>
  )
}

function HeartbeatLine({ hr }: { hr: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickRef   = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const data: number[] = Array(W).fill(H / 2)
    let frame = 0

    const ecg = (x: number, period: number) => {
      const phase = ((x % period) / period) * Math.PI * 2
      if (phase < 0.4) return Math.sin(phase * 7) * 0.15
      if (phase < 0.6) return -Math.sin((phase - 0.4) * 15) * 0.25
      if (phase < 0.7) return Math.sin((phase - 0.6) * 30) * 1.0
      if (phase < 0.8) return -Math.sin((phase - 0.7) * 25) * 0.6
      if (phase < 0.9) return Math.sin((phase - 0.8) * 20) * 0.2
      return 0
    }

    const draw = () => {
      tickRef.current = requestAnimationFrame(draw)
      frame++
      if (frame % 2 !== 0) return

      const period = Math.round(60000 / hr / 16)
      const newY = H / 2 - ecg(frame, period) * H * 0.35
      data.push(newY)
      data.shift()

      ctx.clearRect(0, 0, W, H)
      ctx.beginPath()
      ctx.strokeStyle = 'oklch(0.85 0.20 0)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = 'oklch(0.85 0.20 0)'
      ctx.shadowBlur = 4
      data.forEach((y, i) => i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y))
      ctx.stroke()
    }
    tickRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(tickRef.current)
  }, [hr])

  return <canvas ref={canvasRef} width={200} height={40} className="w-full" style={{ height: 40 }} />
}

function scoreLabel(s: number) {
  if (s >= 90) return ['OPTIMAL',   'var(--color-green)']
  if (s >= 75) return ['NOMINAL',   'var(--color-cyan)']
  if (s >= 55) return ['DEGRADED',  'var(--color-amber)']
  return              ['CRITICAL',  'var(--color-red)']
}

export function SystemHealthGauge({ metrics }: { metrics: LiveMetrics }) {
  const { systemScore, heartRate, hrv, batterySoc, solar, co2, stress, spo2, load } = metrics
  const [label, color] = scoreLabel(systemScore)
  const bioScore  = Math.round((hrv / 60) * 40 + (1 - stress / 100) * 60)
  const energyScore = Math.round((batterySoc / 100) * 50 + (solar / 5) * 50)
  const envScore  = Math.round(Math.max(0, 100 - (co2 - 400) / 3))

  return (
    <div className="card aurora-gradient p-5 flex flex-col gap-4">
      <div className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">System Health</div>

      {/* Concentric arcs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
          <svg viewBox="0 0 140 140" width={140} height={140}>
            <defs>
              <linearGradient id="scoreG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="var(--color-red)"    />
                <stop offset="40%"  stopColor="var(--color-amber)"  />
                <stop offset="100%" stopColor="var(--color-green)"  />
              </linearGradient>
            </defs>
            {/* Outer — overall score */}
            <Arc value={systemScore} color={color as string} size={140} strokeWidth={10} startAngle={135} sweepAngle={270} label="OVERALL" sublabel={`${systemScore}`} />
            {/* Middle — biometric */}
            <Arc value={bioScore} color="oklch(0.85 0.20 0)" size={114} strokeWidth={7} startAngle={140} sweepAngle={260} label="" sublabel="" />
            {/* Inner — energy */}
            <Arc value={energyScore} color="var(--color-amber)" size={94} strokeWidth={6} startAngle={145} sweepAngle={250} label="" sublabel="" />

            {/* Center label */}
            <text x={70} y={72} textAnchor="middle" fontSize={9} fontFamily="Exo 2" fontWeight="800" fill={color as string} letterSpacing="2" style={{ transition: 'fill 0.5s' }}>{label}</text>
          </svg>

          {/* Legend dots */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2">
            {[['var(--color-cyan)', 'System'], ['oklch(0.85_0.20_0)', 'Bio'], ['var(--color-amber)', 'Energy']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-[7px] font-display text-[var(--color-dim)]">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side metrics */}
        <div className="flex-1 space-y-2">
          {/* Heartbeat */}
          <div className="bg-[var(--color-elevated)] rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-display uppercase text-[var(--color-muted)]">Heart Rate</span>
              <span className="mono text-sm font-bold" style={{ color: 'oklch(0.85 0.20 0)' }}>{heartRate} <span className="text-[9px] text-[var(--color-muted)]">bpm</span></span>
            </div>
            <HeartbeatLine hr={heartRate} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { l: 'HRV',    v: hrv,          u: 'ms',  c: 'var(--color-purple)' },
              { l: 'SpO₂',   v: spo2,         u: '%',   c: 'var(--color-green)'  },
              { l: 'Stress', v: stress,        u: '/100',c: stress > 50 ? 'var(--color-red)' : 'var(--color-amber)' },
              { l: 'CO₂',    v: co2,           u: 'ppm', c: co2 > 700 ? 'var(--color-red)' : 'var(--color-cyan)' },
            ].map(m => (
              <div key={m.l} className="bg-[var(--color-elevated)] rounded-lg px-2 py-1.5 text-center">
                <div className="text-[8px] font-display uppercase text-[var(--color-muted)]">{m.l}</div>
                <div className="mono text-sm font-bold leading-tight" style={{ color: m.c }}>{m.v}</div>
                <div className="text-[7px] text-[var(--color-dim)]">{m.u}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domain bars */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'Bio',    v: bioScore,    c: 'oklch(0.85 0.20 0)' },
          { l: 'Energy', v: energyScore, c: 'var(--color-amber)'  },
          { l: 'Environ',v: envScore,    c: 'var(--color-green)'  },
        ].map(s => (
          <div key={s.l} className="text-center">
            <div className="text-[8px] font-display uppercase text-[var(--color-muted)] mb-1">{s.l}</div>
            <div className="h-1 rounded-full bg-[var(--color-elevated)] mb-1">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: s.c }}
                animate={{ width: `${s.v}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
            <div className="mono text-xs font-bold" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
