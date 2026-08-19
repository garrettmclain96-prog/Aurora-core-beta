import { useState } from 'react'
import { Link } from 'wouter'
import { HardDrive, ArrowRight, Boxes } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { loadCases, loadEquipment, type Equipment, type Case } from '../lib/cases'

export function Gear() {
  const [equipment] = useState<Equipment[]>(loadEquipment)
  const [cases] = useState<Case[]>(loadCases)

  return (
    <div>
      <PageHeader title="Gear" subtitle="Everything Aurora has learned about your equipment." />

      <div className="px-4 md:px-6 py-4 md:py-6 max-w-3xl mx-auto">
        {equipment.length === 0 ? (
          <div className="text-center py-16">
            <Boxes className="w-8 h-8 text-[var(--color-dim)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted)] font-display">No equipment on file yet.</p>
            <p className="text-xs text-[var(--color-dim)] mt-1 max-w-sm mx-auto">
              When Aurora identifies a unit during a case — from the model plate or your description — it's remembered here,
              so next time it already knows your gear.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {equipment.map(eq => {
              const linked = cases.filter(c => eq.caseIds.includes(c.id))
              const openCount = linked.filter(c => c.status !== 'resolved').length
              return (
                <div key={eq.id} className="card card-glow p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[oklch(0.82_0.16_196_/_0.10)] border border-[oklch(0.82_0.16_196_/_0.3)] flex items-center justify-center flex-shrink-0">
                      <HardDrive className="w-4 h-4 text-[var(--color-cyan)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-display font-bold text-[var(--color-text)]">{eq.name}</div>
                      <div className="text-[11px] text-[var(--color-muted)] mt-0.5 flex flex-wrap gap-x-2">
                        {eq.make && <span>{eq.make}</span>}
                        {eq.model && <span className="mono">{eq.model}</span>}
                        {eq.category && <span className="text-[var(--color-dim)]">· {eq.category}</span>}
                      </div>
                      {eq.notes && <p className="text-[11px] text-[var(--color-muted)] mt-1.5">{eq.notes}</p>}
                      <div className="text-[10px] text-[var(--color-dim)] mt-2 font-display tracking-wide">
                        {linked.length} case{linked.length === 1 ? '' : 's'}
                        {openCount > 0 && <span className="text-[var(--color-gold)]"> · {openCount} open</span>}
                      </div>
                    </div>
                  </div>
                  {linked.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1">
                      {linked.slice(0, 4).map(c => (
                        <Link key={c.id} href={`/case/${c.id}`}>
                          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-elevated)] cursor-pointer group">
                            <span className="text-xs text-[var(--color-muted)] truncate">{c.title}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-dim)] group-hover:text-[var(--color-cyan)] flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
