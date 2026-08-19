import { useState } from 'react'
import { useLocation, Link } from 'wouter'
import { motion } from 'framer-motion'
import { Plus, Wrench, ArrowRight, CheckCircle2, Search } from 'lucide-react'
import { PageHeader } from '../components/Layout'
import { loadCases, saveCases, newCase, upsertCase, type Case, type CaseStatus } from '../lib/cases'

const STATUS: Record<CaseStatus, { label: string; color: string; dot: string }> = {
  open:       { label: 'Open',       color: 'var(--color-cyan)',  dot: 'var(--color-cyan)' },
  diagnosing: { label: 'Diagnosing', color: 'var(--color-gold)',  dot: 'var(--color-gold)' },
  resolved:   { label: 'Resolved',   color: 'var(--color-green)', dot: 'var(--color-green)' },
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

export function Cases() {
  const [, setLocation] = useLocation()
  const [cases, setCases] = useState<Case[]>(loadCases)
  const [problem, setProblem] = useState('')

  const start = () => {
    const text = problem.trim()
    if (!text) return
    const c = newCase(text)
    const next = upsertCase(cases, c)
    saveCases(next)
    setCases(next)
    setProblem('')
    setLocation(`/case/${c.id}`)
  }

  const open = cases.filter(c => c.status !== 'resolved')
  const resolved = cases.filter(c => c.status === 'resolved')

  return (
    <div>
      <PageHeader title="Cases" subtitle="Tell Aurora what's wrong. It figures out the rest." />

      <div className="px-4 md:px-6 py-4 md:py-6 max-w-3xl mx-auto space-y-6">
        {/* New case composer */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 aurora-gradient">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-[var(--color-cyan)]" />
            <span className="font-display text-sm font-bold text-[var(--color-text)]">Start a case</span>
          </div>
          <textarea
            value={problem}
            onChange={e => setProblem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) start() }}
            placeholder="e.g. My AC runs but the house won't cool. It's a rooftop RV unit and the air coming out isn't cold."
            className="w-full min-h-[92px] bg-[var(--color-void)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] resize-y"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-[var(--color-dim)] font-display tracking-wide">⌘/Ctrl + Enter</span>
            <button
              onClick={start}
              disabled={!problem.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.82_0.16_196_/_0.14)] border border-[oklch(0.82_0.16_196_/_0.4)] text-[var(--color-cyan)] font-display text-xs font-bold tracking-wide disabled:opacity-40 transition-all active:scale-95">
              <Plus className="w-3.5 h-3.5" /> Open case
            </button>
          </div>
        </motion.div>

        {/* Open cases */}
        {open.length > 0 && (
          <div>
            <SectionRow label="Open" count={open.length} />
            <div className="space-y-2">
              {open.map(c => <CaseCard key={c.id} c={c} />)}
            </div>
          </div>
        )}

        {/* Resolved cases */}
        {resolved.length > 0 && (
          <div>
            <SectionRow label="Resolved" count={resolved.length} />
            <div className="space-y-2">
              {resolved.map(c => <CaseCard key={c.id} c={c} />)}
            </div>
          </div>
        )}

        {cases.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-8 h-8 text-[var(--color-dim)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-muted)] font-display">No cases yet.</p>
            <p className="text-xs text-[var(--color-dim)] mt-1">Describe something that's broken and Aurora will start diagnosing.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">{label}</span>
      <span className="mono text-[10px] text-[var(--color-dim)]">{count}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

function CaseCard({ c }: { c: Case }) {
  const s = STATUS[c.status]
  return (
    <Link href={`/case/${c.id}`}>
      <div className="card card-glow p-3.5 cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="status-dot" style={{ background: s.dot }} />
              <span className="text-[9px] font-display font-bold tracking-wide uppercase" style={{ color: s.color }}>{s.label}</span>
              <span className="text-[9px] text-[var(--color-dim)]">· {timeAgo(c.updatedAt)}</span>
            </div>
            <div className="text-sm text-[var(--color-text)] font-medium truncate">{c.title}</div>
            {c.probableCause && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[var(--color-green)]">
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{c.probableCause}</span>
              </div>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--color-dim)] group-hover:text-[var(--color-cyan)] transition-colors flex-shrink-0 mt-0.5" />
        </div>
      </div>
    </Link>
  )
}
