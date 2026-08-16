import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader, StatusDot, SectionLabel } from '../components/Layout'
import { layers } from '../lib/seed'

export function CognitiveLayers() {
  const [open, setOpen] = useState<number | null>(3)

  return (
    <div>
      <PageHeader
        title="Cognitive Layers"
        subtitle="Seven-layer closed feedback loop · L1 → L7 → L1"
      />

      <div className="p-6 space-y-6">
        {/* Architecture overview */}
        <div className="card aurora-gradient p-4">
          <SectionLabel>System Architecture</SectionLabel>
          <div className="flex items-center justify-between overflow-x-auto gap-1 pb-1">
            {layers.map((l, i) => (
              <div key={l.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setOpen(l.id === open ? null : l.id)}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-md hover:bg-[var(--color-elevated)] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-display font-bold border"
                    style={{ borderColor: l.color + '60', color: l.color, backgroundColor: l.color + '15' }}
                  >
                    {l.id}
                  </div>
                  <span className="text-[9px] font-display text-[var(--color-muted)] whitespace-nowrap">{l.abbr.split(' · ')[1]}</span>
                </button>
                {i < layers.length - 1 && (
                  <div className="w-4 h-px bg-[var(--color-border)]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {layers.map(l => (
            <div
              key={l.id}
              className={clsx('card overflow-hidden transition-all', open === l.id && 'card-glow')}
              style={open === l.id ? { borderColor: l.color + '60' } : undefined}
            >
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-[var(--color-elevated)] transition-colors"
                onClick={() => setOpen(l.id === open ? null : l.id)}
              >
                <StatusDot status={l.status as 'active' | 'conflict'} />
                <span
                  className="mono text-[10px] w-20 flex-shrink-0"
                  style={{ color: l.color }}
                >{l.abbr}</span>
                <span className="text-sm font-display font-semibold text-[var(--color-text)] flex-1">{l.name}</span>
                <span className="mono text-xs text-[var(--color-muted)] mr-4">{l.throughput}</span>
                <ChevronDown
                  className={clsx('w-4 h-4 text-[var(--color-muted)] transition-transform flex-shrink-0', open === l.id && 'rotate-180')}
                />
              </button>

              {open === l.id && (
                <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-muted)] mt-3 leading-relaxed">{l.desc}</p>
                  <div className="mt-3">
                    <div className="text-[10px] font-display font-bold tracking-[0.12em] uppercase text-[var(--color-dim)] mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-2">
                      {l.caps.map(cap => (
                        <span
                          key={cap}
                          className="text-[10px] font-display px-2 py-0.5 rounded border"
                          style={{ borderColor: l.color + '40', color: l.color, backgroundColor: l.color + '10' }}
                        >{cap}</span>
                      ))}
                    </div>
                  </div>

                  {/* Throughput bar */}
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-display text-[var(--color-muted)] w-20">Throughput</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-elevated)]">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: l.status === 'active' ? '100%' : '60%', backgroundColor: l.color }}
                      />
                    </div>
                    <span className="mono text-[10px]" style={{ color: l.color }}>{l.throughput}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
