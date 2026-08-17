import { motion } from 'framer-motion'
import type { LiveMetrics } from '../types'

function ArcGauge({ value, max, color, label, unit, size = 80 }: {
  value: number; max: number; color: string; label: string; unit: string; size?: number
}) {
  const r = size * 0.38, c = size / 2
  const circ = 2 * Math.PI * r, arc = circ * 0.7, fill = arc * Math.min(value / max, 1)
  const pt = (deg: number) => ({
    x: c + r * Math.cos((deg - 90) * Math.PI / 180),
    y: c + r * Math.sin((deg - 90) * Math.PI / 180),
  })
  const s = pt(126), e = pt(126 + 252)
  const d = `M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${e.x} ${e.y}`
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <path d={d} fill="none" stroke="#132030" strokeWidth={4} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${fill} ${arc}`}
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={c} y={c + 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.2} fontFamily="JetBrains Mono" fontWeight="700" fill={color}>{value}</text>
        <text x={c} y={c + size * 0.2} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.11} fontFamily="JetBrains Mono" fill="#5a8a9f">{unit}</text>
      </svg>
      <div className="mono text-[8px] text-[var(--color-muted)] tracking-wider uppercase -mt-1">{label}</div>
    </div>
  )
}

export function EnvironmentPanel({ metrics }: { metrics: LiveMetrics }) {
  const { co2, temp, humidity, pm25 } = metrics
  const airQuality = co2 < 600 ? 'Excellent' : co2 < 800 ? 'Good' : co2 < 1000 ? 'Fair' : 'Poor'
  const airColor   = co2 < 600 ? '#39ff14'   : co2 < 800 ? '#00ffc8' : co2 < 1000 ? '#ffd60a' : '#ff3366'
  const conservationScore = Math.round(Math.max(0, 100 - (co2 - 400) / 3.5))

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[#39ff14] text-sm">🌿</span>
        <span className="display font-black text-sm text-[#39ff14]" style={{ textShadow: '0 0 12px #39ff1480' }}>ENVIRONMENT</span>
        <span className="mono text-[9px] text-[var(--color-muted)] ml-auto">LIVE</span>
        <span className="status-dot pulse-dot" style={{ backgroundColor: '#39ff14', width: 5, height: 5 }} />
      </div>

      {/* Air quality banner */}
      <div className="card p-3 flex-shrink-0" style={{ borderColor: airColor + '30', background: airColor + '08' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="mono text-[8px] text-[var(--color-muted)] tracking-wider uppercase">Air Quality</div>
            <div className="display font-black text-xl mt-0.5" style={{ color: airColor, textShadow: `0 0 10px ${airColor}60` }}>{airQuality}</div>
            <div className="mono text-[8px] text-[var(--color-muted)] mt-0.5">(IAQ)</div>
          </div>
          <div className="text-4xl opacity-80">
            {co2 < 600 ? '🌿' : co2 < 800 ? '🌱' : co2 < 1000 ? '💨' : '⚠️'}
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <ArcGauge value={Math.round(temp)} max={100} color="#ffd60a" label="TEMP"     unit="°F"    size={76} />
        <ArcGauge value={Math.round(humidity)} max={100} color="#7df9ff" label="HUMIDITY" unit="%RH"   size={76} />
      </div>

      {/* CO2 + PM2.5 bars */}
      <div className="card p-3 flex-shrink-0 space-y-2.5" style={{ borderColor: '#39ff1418' }}>
        {[
          { l: 'CO₂ Level',  v: co2,  max: 1500, unit: 'ppm',   c: co2 > 800 ? '#ffd60a' : '#39ff14' },
          { l: 'PM2.5',      v: pm25, max: 50,   unit: 'μg/m³', c: pm25 > 15 ? '#ffd60a' : '#39ff14' },
        ].map(m => (
          <div key={m.l}>
            <div className="flex items-center justify-between mb-1">
              <span className="mono text-[9px] text-[var(--color-muted)]">{m.l}</span>
              <span className="mono text-[9px] font-bold" style={{ color: m.c }}>{m.v} {m.unit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-border)]">
              <motion.div className="h-full rounded-full" style={{ backgroundColor: m.c, boxShadow: `0 0 6px ${m.c}60` }}
                animate={{ width: `${Math.min((m.v / m.max) * 100, 100)}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Conservation score */}
      <div className="card p-3 flex-1" style={{ borderColor: '#39ff1418' }}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <svg width={64} height={64}>
              {(() => {
                const r = 24, c = 32, circ = 2 * Math.PI * r
                const fill = circ * (conservationScore / 100)
                return (
                  <>
                    <circle cx={c} cy={c} r={r} fill="none" stroke="#132030" strokeWidth={4} />
                    <circle cx={c} cy={c} r={r} fill="none" stroke="#39ff14" strokeWidth={4}
                      strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
                      transform="rotate(-90 32 32)"
                      style={{ filter: 'drop-shadow(0 0 5px #39ff14)', transition: 'stroke-dasharray 0.8s ease' }} />
                    <text x={c} y={c + 2} textAnchor="middle" dominantBaseline="middle"
                      fontSize={14} fontFamily="JetBrains Mono" fontWeight="700" fill="#39ff14">{conservationScore}</text>
                  </>
                )
              })()}
            </svg>
            <div className="mono text-[7px] text-[var(--color-muted)] tracking-wider uppercase text-center">CONSERVATION<br/>SCORE</div>
          </div>
          <div className="flex-1">
            <div className="mono text-[9px] text-[#39ff14] font-bold mb-1">
              {conservationScore >= 85 ? 'Optimal conditions. Keep it up!' : 'Minor adjustments recommended'}
            </div>
            <div className="space-y-1">
              {[
                { l: 'Ventilation',  v: 'Active',   c: '#39ff14' },
                { l: 'CO₂ Advisory', v: co2 > 700 ? '⚠ Approaching' : '✓ Nominal', c: co2 > 700 ? '#ffd60a' : '#39ff14' },
                { l: 'TurnBot HVAC', v: 'Auto',     c: '#00ffc8' },
              ].map(r => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="mono text-[8px] text-[var(--color-muted)]">{r.l}</span>
                  <span className="mono text-[8px] font-bold" style={{ color: r.c }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
