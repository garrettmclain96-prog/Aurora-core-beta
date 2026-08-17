import type { LiveMetrics } from '../types'

type Props = { metrics: LiveMetrics }

export function DataTicker({ metrics }: Props) {
  const items = [
    { label: 'LOAD',      value: `${metrics.load} kW`,              color: 'var(--color-amber)'  },
    { label: 'SOLAR',     value: `${metrics.solar} kW`,             color: 'var(--color-green)'  },
    { label: 'BATTERY',   value: `${metrics.batterySoc}%`,          color: 'var(--color-cyan)'   },
    { label: 'GRID',      value: `${metrics.grid.toFixed(2)} kW`,   color: 'var(--color-blue)'   },
    { label: 'HEART',     value: `${metrics.heartRate} bpm`,        color: 'var(--color-rose)'   },
    { label: 'HRV',       value: `${metrics.hrv} ms`,               color: 'var(--color-purple)' },
    { label: 'SpO₂',      value: `${metrics.spo2}%`,                color: 'var(--color-green)'  },
    { label: 'CO₂',       value: `${metrics.co2} ppm`,              color: 'var(--color-amber)'  },
    { label: 'TEMP',      value: `${metrics.temp}°F`,               color: 'var(--color-cyan)'   },
    { label: 'HUMIDITY',  value: `${metrics.humidity}%RH`,          color: 'var(--color-blue)'   },
    { label: 'PM2.5',     value: `${metrics.pm25} μg/m³`,           color: 'var(--color-purple)' },
    { label: 'SCORE',     value: `${metrics.systemScore}/100`,      color: 'var(--color-green)'  },
  ]

  // Duplicate for seamless loop
  const all = [...items, ...items]

  return (
    <div className="h-7 border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-md overflow-hidden flex items-center relative">
      <div className="scanline" />
      {/* LIVE badge */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-[var(--color-border)] h-full bg-[oklch(0.82_0.16_196_/_0.06)]">
        <span className="status-dot pulse-dot" style={{ backgroundColor: 'var(--color-green)', width: 5, height: 5 }} />
        <span className="mono text-[9px] text-[var(--color-green)] tracking-widest">LIVE</span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-track flex items-center gap-0 whitespace-nowrap">
          {all.map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-4 border-r border-[var(--color-border)]/40">
              <span className="text-[9px] font-display tracking-widest text-[var(--color-dim)]">{item.label}</span>
              <span className="mono text-[9px] font-bold" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
