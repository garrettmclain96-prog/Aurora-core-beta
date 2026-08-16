import { useEffect, useRef } from 'react'
import type { LiveMetrics } from '../lib/useRealtime'

type FlowNodeProps = {
  cx: number; cy: number; label: string; value: string
  icon: string; color: string; active?: boolean; size?: number
}

function FlowNode({ cx, cy, label, value, icon, color, active = true, size = 44 }: FlowNodeProps) {
  const r = size / 2
  return (
    <g transform={`translate(${cx},${cy})`}>
      {active && (
        <circle r={r + 8} fill="none" stroke={color} strokeWidth={1} opacity={0.2}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
      )}
      <rect x={-r} y={-r} width={size} height={size} rx={10}
        fill={active ? `${color}18` : 'oklch(0.13 0.030 240)'}
        stroke={active ? color : 'oklch(0.20 0.040 240)'} strokeWidth={1.5}
        style={active ? { filter: `drop-shadow(0 0 8px ${color}60)` } : undefined}
      />
      <text x={0} y={-4} textAnchor="middle" fontSize={16} dominantBaseline="middle">{icon}</text>
      <text x={0} y={r + 10} textAnchor="middle" fontSize={8} fontFamily="Exo 2" fontWeight="700"
        fill={active ? 'oklch(0.93 0.012 240)' : 'oklch(0.36 0.038 240)'} letterSpacing="0.5">{label}</text>
      <text x={0} y={r + 21} textAnchor="middle" fontSize={8} fontFamily="Share Tech Mono" fontWeight="bold"
        fill={active ? color : 'oklch(0.36 0.038 240)'}>{value}</text>
    </g>
  )
}

type AnimatedFlowProps = {
  x1: number; y1: number; x2: number; y2: number
  color: string; active: boolean; reverse?: boolean; label?: string
}

function AnimatedFlow({ x1, y1, x2, y2, color, active, reverse = false, label }: AnimatedFlowProps) {
  const canvasRef = useRef<SVGCircleElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const progressRef = useRef(reverse ? 1 : 0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!active || !canvasRef.current || !pathRef.current) return
    const path = pathRef.current
    const dot = canvasRef.current
    const length = path.getTotalLength()
    const speed = reverse ? -0.006 : 0.006

    const animate = () => {
      progressRef.current = ((progressRef.current + speed) % 1 + 1) % 1
      const pt = path.getPointAtLength(progressRef.current * length)
      dot.setAttribute('cx', String(pt.x))
      dot.setAttribute('cy', String(pt.y))
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [active, reverse])

  const dx = x2 - x1, dy = y2 - y1
  const mx = x1 + dx * 0.5, my = y1 + dy * 0.5
  const curve = `M ${x1} ${y1} Q ${mx + dy * 0.1} ${my - dx * 0.1} ${x2} ${y2}`

  return (
    <g>
      {/* Track */}
      <path d={curve} fill="none"
        stroke={active ? color : 'oklch(0.20 0.040 240)'} strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? 'none' : '4 3'} opacity={active ? 1 : 0.4}
        ref={pathRef}
        style={active ? { filter: `drop-shadow(0 0 4px ${color}80)` } : undefined}
      />
      {/* Animated dot */}
      {active && (
        <circle
          ref={canvasRef} r={3.5} fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      )}
      {/* Flow label */}
      {label && (
        <>
          <rect x={mx - 18} y={my - 10} width={36} height={14} rx={4}
            fill="oklch(0.07 0.022 240)" stroke={active ? color + '40' : 'transparent'} strokeWidth={0.5} />
          <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle" fontSize={7.5}
            fontFamily="Share Tech Mono" fontWeight="bold"
            fill={active ? color : 'oklch(0.36 0.038 240)'}>{label}</text>
        </>
      )}
    </g>
  )
}

export function EnergyFlow({ metrics }: { metrics: LiveMetrics }) {
  const { solar, load, grid, batterySoc, batteryCurrent } = metrics
  const isCharging  = batteryCurrent > 0
  const isExporting = grid < 0
  const hasSolar    = solar > 0.1
  const hasGrid     = Math.abs(grid) > 0.05
  const hasBattery  = Math.abs(batteryCurrent) > 0.2

  return (
    <div className="card p-4">
      <div className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)] mb-3">Live Power Flow</div>
      <div className="w-full" style={{ aspectRatio: '2.4 / 1', minHeight: 170 }}>
        <svg viewBox="0 0 480 200" className="w-full h-full overflow-visible">

          {/* Solar → Home */}
          <AnimatedFlow x1={72} y1={120} x2={190} y2={120} color="var(--color-green)"  active={hasSolar}   label={hasSolar ? `${solar}kW` : undefined} />
          {/* Home → Grid */}
          <AnimatedFlow x1={290} y1={120} x2={408} y2={120} color="var(--color-blue)"   active={hasGrid}    label={hasGrid ? `${Math.abs(grid).toFixed(1)}kW` : undefined} reverse={isExporting} />
          {/* Home ↔ Battery */}
          <AnimatedFlow x1={240} y1={90}  x2={240} y2={32}  color={isCharging ? 'var(--color-green)' : 'var(--color-amber)'} active={hasBattery} label={hasBattery ? `${Math.abs(batteryCurrent).toFixed(1)}A` : undefined} reverse={isCharging} />

          {/* Nodes */}
          <FlowNode cx={44}  cy={120} icon="☀️" label="SOLAR"   value={`${solar} kW`}   color="var(--color-green)"  active={hasSolar} />
          <FlowNode cx={240} cy={120} icon="🏠" label="HOME"    value={`${load} kW`}    color="var(--color-cyan)"   active={true} size={48} />
          <FlowNode cx={436} cy={120} icon="⚡" label="GRID"    value={`${Math.abs(grid).toFixed(2)} kW`} color="var(--color-blue)" active={hasGrid} />
          <FlowNode cx={240} cy={18}  icon="🔋" label="BATTERY" value={`${batterySoc}%`} color="var(--color-amber)"  active={true} />

          {/* Status badges */}
          {isCharging && (
            <text x={265} y={62} fontSize={7} fontFamily="Exo 2" fontWeight="700" fill="var(--color-green)">▲ CHARGING</text>
          )}
          {!isCharging && hasBattery && (
            <text x={262} y={62} fontSize={7} fontFamily="Exo 2" fontWeight="700" fill="var(--color-amber)">▼ DISCHARGE</text>
          )}
        </svg>
      </div>
    </div>
  )
}
