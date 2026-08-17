import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { LiveMetrics } from '../types'

function ECGCanvas({ hr }: { hr: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tick = useRef(0)
  const data = useRef<number[]>([])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    const W = canvas.offsetWidth, H = canvas.offsetHeight

    const period = Math.round(60000 / hr / 16)
    const ecg = (phase: number) => {
      const p = ((phase % period) / period) * Math.PI * 2
      if (p < 0.3)  return Math.sin(p * 8) * 0.1
      if (p < 0.45) return -Math.sin((p - 0.3) * 12) * 0.15
      if (p < 0.55) return Math.sin((p - 0.45) * 30) * 1
      if (p < 0.65) return -Math.sin((p - 0.55) * 25) * 0.55
      if (p < 0.75) return Math.sin((p - 0.65) * 18) * 0.18
      return 0
    }

    let frame = 0
    const animate = () => {
      frame++
      if (frame % 2 !== 0) { tick.current = requestAnimationFrame(animate); return }
      data.current.push(H / 2 - ecg(frame) * H * 0.38)
      if (data.current.length > W) data.current.shift()

      ctx.clearRect(0, 0, W, H)

      // Grid lines
      ctx.strokeStyle = '#13203020'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      if (data.current.length < 2) { tick.current = requestAnimationFrame(animate); return }

      // Glow trail
      ctx.beginPath()
      data.current.forEach((y, i) => i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y))
      ctx.strokeStyle = '#ff336620'
      ctx.lineWidth = 4
      ctx.stroke()

      // Main line
      ctx.beginPath()
      data.current.forEach((y, i) => i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y))
      ctx.strokeStyle = '#ff3366'
      ctx.lineWidth = 1.5
      ctx.shadowBlur = 6
      ctx.shadowColor = '#ff3366'
      ctx.stroke()
      ctx.shadowBlur = 0

      // Leading dot
      const last = data.current[data.current.length - 1]
      ctx.beginPath()
      ctx.arc(data.current.length - 1, last, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ff3366'
      ctx.shadowBlur = 10
      ctx.shadowColor = '#ff3366'
      ctx.fill()
      ctx.shadowBlur = 0

      tick.current = requestAnimationFrame(animate)
    }
    tick.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(tick.current)
  }, [hr])

  return <canvas ref={ref} className="w-full" style={{ height: 56 }} />
}

function Ring({ value, max = 100, color, label, sublabel, size = 72 }: {
  value: number; max?: number; color: string; label: string; sublabel: string; size?: number
}) {
  const r = size * 0.38, c = size / 2
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const fill = arc * Math.min(value / max, 1)
  const startDeg = 135

  const pt = (deg: number) => ({
    x: c + r * Math.cos((deg - 90) * Math.PI / 180),
    y: c + r * Math.sin((deg - 90) * Math.PI / 180),
  })
  const s = pt(startDeg), e = pt(startDeg + 270)
  const d = `M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${e.x} ${e.y}`

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <path d={d} fill="none" stroke="#132030" strokeWidth={5} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${fill} ${arc}`}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={c} y={c + 3} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.22} fontFamily="JetBrains Mono" fontWeight="700" fill={color}>{label}</text>
        <text x={c} y={c + size * 0.2} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.12} fontFamily="JetBrains Mono" fill="#5a8a9f">{sublabel}</text>
      </svg>
    </div>
  )
}

export function HealthPanel({ metrics }: { metrics: LiveMetrics }) {
  const { heartRate, hrv, spo2, stress, systemScore } = metrics
  const wellness = Math.round((hrv / 60) * 40 + (1 - stress / 100) * 60)

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[#ff3366] text-sm">♥</span>
        <span className="display font-black text-sm text-[#ff3366]" style={{ textShadow: '0 0 12px #ff336680' }}>HEALTH</span>
        <span className="mono text-[9px] text-[var(--color-muted)] ml-auto">LIVE</span>
        <span className="status-dot pulse-dot" style={{ backgroundColor: '#ff3366', width: 5, height: 5 }} />
      </div>

      {/* ECG */}
      <div className="card p-2 flex-shrink-0" style={{ borderColor: '#ff336625' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] mb-1 tracking-wider">ECG · {heartRate} BPM</div>
        <ECGCanvas hr={heartRate} />
      </div>

      {/* HRV + SpO2 rings */}
      <div className="flex items-center justify-around">
        <Ring value={hrv}  max={80} color="#ff3366" label={String(hrv)}  sublabel="HRV ms" size={68} />
        <Ring value={spo2} max={100} color="#7df9ff" label={`${spo2}%`} sublabel="SpO₂"   size={68} />
        <Ring value={wellness} color="#9b5de5" label={String(wellness)} sublabel="WELLNESS" size={68} />
      </div>

      {/* Biometric table */}
      <div className="card p-3 flex-1" style={{ borderColor: '#ff336618' }}>
        <div className="mono text-[8px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-2">Biometric Summary</div>
        <div className="space-y-1.5">
          {[
            { l: 'Heart Rate',       v: `${heartRate} bpm`,   c: '#ff3366' },
            { l: 'HRV',              v: `${hrv} ms`,          c: '#ff8fa3' },
            { l: 'SpO₂',             v: `${spo2}%`,           c: '#7df9ff' },
            { l: 'Stress Index',     v: stress < 25 ? 'LOW' : stress < 60 ? 'MED' : 'HIGH', c: stress < 25 ? '#39ff14' : stress < 60 ? '#ffd60a' : '#ff3366' },
            { l: 'Sleep Quality',    v: '89%',                c: '#9b5de5' },
          ].map(row => (
            <div key={row.l} className="flex items-center justify-between">
              <span className="mono text-[9px] text-[var(--color-muted)]">{row.l}</span>
              <span className="mono text-[9px] font-bold" style={{ color: row.c }}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
