/**
 * Aurora Core — XIII Pillars Panel
 * Live visualization of the Doctrine of Discipline governance layer.
 *
 * Doctrine: The XIII Pillars — Shawn C. O'Neil (@Black Haus Capital)
 * "Discipline is not punishment. It is architecture."
 * Aurora Core adaptation by Garrett McLain.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition } from '../components/PageTransition'
import { PageHeader, SectionLabel } from '../components/Layout'
import { useRealtime } from '../hooks/useRealtime'
import { usePillars } from '../hooks/usePillars'
import type { Pillar, Verdict, VerdictAction, PillarState } from '../services/PillarsEngine'

// ── Color maps ────────────────────────────────────────────────────────────────

const STATE_COLOR: Record<PillarState, string> = {
  dormant:   'var(--color-dim)',
  active:    'var(--color-green)',
  conflict:  'var(--color-amber)',
  enforcing: 'var(--color-cyan)',
  violated:  'var(--color-red)',
}

const ACTION_COLOR: Record<VerdictAction, string> = {
  HOLD:     'var(--color-green)',
  ASCEND:   'var(--color-cyan)',
  ALERT:    'var(--color-amber)',
  ENFORCE:  'var(--color-orange, #f97316)',
  ESCALATE: 'var(--color-red)',
  OVERRIDE: 'var(--color-purple, #a855f7)',
}

const OVERALL_CONFIG = {
  sovereign:   { color: 'var(--color-green)',   label: 'SOVEREIGN',   desc: 'All pillars holding discipline' },
  disciplined: { color: 'var(--color-cyan)',    label: 'DISCIPLINED', desc: 'Minor violations — doctrine intact' },
  strained:    { color: 'var(--color-amber)',   label: 'STRAINED',    desc: 'Multiple pillars under pressure' },
  crisis:      { color: 'var(--color-red)',     label: 'CRISIS',      desc: 'Critical violation — immediate action required' },
}

// Roman numerals
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII']

// ── Sub-components ────────────────────────────────────────────────────────────

function SovereigntyBanner({ state }: { state: PillarsState['overallState'] }) {
  const cfg = OVERALL_CONFIG[state]
  return (
    <motion.div
      className="card p-4 flex items-center gap-4"
      style={{ borderColor: cfg.color + '40' }}
      animate={{ boxShadow: `0 0 20px ${cfg.color}20` }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
        style={{ backgroundColor: cfg.color + '20', color: cfg.color, borderColor: cfg.color + '40', border: '1px solid' }}
      >
        XIII
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold tracking-widest text-sm" style={{ color: cfg.color }}>
          DOCTRINE STATE — {cfg.label}
        </div>
        <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{cfg.desc}</div>
      </div>
      <motion.div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.color }}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  )
}

function DominantVerdictCard({ verdict }: { verdict: Verdict }) {
  const color = ACTION_COLOR[verdict.action]
  return (
    <motion.div
      key={verdict.timestamp}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
      style={{ borderColor: color + '40', backgroundColor: color + '08' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-display font-bold"
          style={{ backgroundColor: color + '20', color }}
        >
          {ROMAN[verdict.pillarId - 1]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-display font-bold tracking-widest" style={{ color }}>
              {verdict.action}
            </span>
            <span className="text-[9px] text-[var(--color-muted)]">·</span>
            <span className="text-[10px] font-display text-[var(--color-muted)]">
              PILLAR {ROMAN[verdict.pillarId - 1]} — {verdict.pillarName.toUpperCase()}
            </span>
          </div>
          <div className="text-xs text-[var(--color-text)] leading-snug">{verdict.reason}</div>
          <div className="text-[9px] text-[var(--color-muted)] mt-1 italic">"{verdict.law}"</div>
        </div>
      </div>
    </motion.div>
  )
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const stateColor  = STATE_COLOR[pillar.state]
  const isDormant   = pillar.state === 'dormant'
  const verdictColor = pillar.lastVerdict ? ACTION_COLOR[pillar.lastVerdict.action] : stateColor

  return (
    <motion.div
      layout
      className={clsx(
        'card p-3 flex flex-col gap-2 cursor-default transition-all duration-300',
        pillar.state === 'violated'  && 'border-[var(--color-red)]/30',
        pillar.state === 'conflict'  && 'border-[var(--color-amber)]/30',
        pillar.state === 'enforcing' && 'border-[var(--color-cyan)]/30',
        pillar.state === 'active'    && 'border-[var(--color-green)]/20',
      )}
      animate={{
        boxShadow: isDormant ? 'none' : `0 0 8px ${stateColor}25`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-display font-bold"
          style={{
            backgroundColor: stateColor + '18',
            color: stateColor,
            border: `1px solid ${stateColor}40`,
          }}
        >
          {ROMAN[pillar.id - 1]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-display font-bold text-[var(--color-text)] leading-tight truncate">
            {pillar.name.toUpperCase()}
          </div>
          <div className="text-[8px] text-[var(--color-muted)] leading-tight mt-0.5 truncate">
            {pillar.source.toUpperCase()}
            {pillar.ally && <span className="text-[var(--color-dim)]"> · ally: {pillar.ally.toUpperCase()}</span>}
          </div>
        </div>
        {/* State dot */}
        <motion.div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: stateColor }}
          animate={pillar.state === 'violated' || pillar.state === 'conflict'
            ? { opacity: [1, 0.2, 1] }
            : { opacity: 1 }
          }
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>

      {/* Law */}
      <div className="text-[9px] italic text-[var(--color-muted)] leading-snug">
        "{pillar.law}"
      </div>

      {/* Last value */}
      {pillar.lastValue !== null && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[var(--color-dim)] font-display">LAST VALUE</span>
          <span className="mono text-[11px]" style={{ color: verdictColor }}>
            {pillar.lastValue.toFixed(1)}
          </span>
        </div>
      )}

      {/* Verdict */}
      {pillar.lastVerdict && (
        <div
          className="text-[9px] font-display px-2 py-1 rounded"
          style={{
            backgroundColor: verdictColor + '12',
            color: verdictColor,
          }}
        >
          {pillar.lastVerdict.action} · {pillar.lastVerdict.reason.slice(0, 42)}
          {pillar.lastVerdict.reason.length > 42 && '…'}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 pt-1 border-t border-[var(--color-border)]">
        <div className="text-center flex-1">
          <div className="mono text-[11px] text-[var(--color-cyan)]">{pillar.activations}</div>
          <div className="text-[7px] text-[var(--color-dim)] font-display uppercase">enforced</div>
        </div>
        <div className="text-center flex-1">
          <div className="mono text-[11px]" style={{ color: pillar.violations > 0 ? 'var(--color-red)' : 'var(--color-dim)' }}>
            {pillar.violations}
          </div>
          <div className="text-[7px] text-[var(--color-dim)] font-display uppercase">violated</div>
        </div>
        <div className="text-center flex-1">
          <div
            className="text-[9px] font-display font-bold"
            style={{ color: STATE_COLOR[pillar.state] }}
          >
            {pillar.state.toUpperCase()}
          </div>
          <div className="text-[7px] text-[var(--color-dim)] font-display uppercase">state</div>
        </div>
      </div>
    </motion.div>
  )
}

function VerdictFeed({ verdicts }: { verdicts: Verdict[] }) {
  const recent = [...verdicts].reverse().slice(0, 15)
  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      <AnimatePresence mode="popLayout" initial={false}>
        {recent.map((v, i) => {
          const color = ACTION_COLOR[v.action]
          return (
            <motion.div
              key={`${v.timestamp}-${i}`}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px]"
              style={{ backgroundColor: color + '08', borderLeft: `2px solid ${color}60` }}
            >
              <span className="font-display font-bold w-6 flex-shrink-0" style={{ color }}>
                {ROMAN[v.pillarId - 1]}
              </span>
              <span className="font-display text-[9px] w-16 flex-shrink-0" style={{ color }}>
                {v.action}
              </span>
              <span className="text-[var(--color-muted)] flex-1 truncate">{v.reason}</span>
              <span
                className="text-[8px] font-display flex-shrink-0 px-1 rounded"
                style={{ backgroundColor: color + '20', color }}
              >
                {v.severity}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
      {recent.length === 0 && (
        <div className="text-center text-[var(--color-muted)] text-xs font-display py-6">
          Awaiting first doctrine evaluation…
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PillarsState = ReturnType<typeof usePillars>

export function PillarsPanel() {
  const liveMetrics  = useRealtime()
  const pillarsState = usePillars(liveMetrics)
  const { pillars, verdicts, activeCount, conflictCount, violationCount, overallState, dominantVerdict } = pillarsState

  const severityCounts = useMemo(() => {
    const recent = verdicts.slice(-50)
    return {
      critical: recent.filter(v => v.severity === 'critical').length,
      high:     recent.filter(v => v.severity === 'high').length,
      medium:   recent.filter(v => v.severity === 'medium').length,
      low:      recent.filter(v => v.severity === 'low').length,
    }
  }, [verdicts])

  return (
    <PageTransition>
      <PageHeader
        title="XIII PILLARS"
        subtitle="Doctrine of Discipline — thirteen governing laws · one per service integration"
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* Attribution */}
        <div className="card p-3 flex items-center gap-3 border-[oklch(0.82_0.16_260_/_0.3)]">
          <div className="w-7 h-7 rounded-md bg-[oklch(0.82_0.16_260_/_0.10)] border border-[oklch(0.82_0.16_260_/_0.35)] flex items-center justify-center flex-shrink-0">
            <span className="text-xs">⚖️</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-display font-bold tracking-wider" style={{ color: 'oklch(0.82 0.16 260)' }}>
              DOCTRINE OF DISCIPLINE — XIII PILLARS GOVERNANCE LAYER
            </div>
            <div className="text-[9px] text-[var(--color-muted)] mt-0.5 leading-snug">
              Governing laws drawn from{' '}
              <span className="text-[var(--color-text)]">The XIII Pillars</span> by{' '}
              <span style={{ color: 'oklch(0.82 0.16 260)' }}>Shawn C. O'Neil</span>{' '}
              (Black Haus Publishing, 2026). Aurora Core adaptation by{' '}
              <span style={{ color: 'oklch(0.82 0.16 260)' }}>Garrett McLain</span>.{' '}
              <span className="italic">"Discipline is not punishment. It is architecture."</span>
            </div>
          </div>
        </div>

        {/* Sovereignty banner */}
        <SovereigntyBanner state={overallState} />

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Active',    value: activeCount,    color: 'var(--color-green)' },
            { label: 'Conflict',  value: conflictCount,  color: 'var(--color-amber)' },
            { label: 'Violated',  value: violationCount, color: 'var(--color-red)'   },
            { label: 'Critical',  value: severityCounts.critical, color: 'var(--color-red)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-2.5 text-center">
              <div className="mono text-lg font-bold" style={{ color }}>{value}</div>
              <div className="text-[8px] font-display text-[var(--color-muted)] uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Dominant verdict */}
        <AnimatePresence mode="wait">
          {dominantVerdict && (
            <DominantVerdictCard key={dominantVerdict.timestamp} verdict={dominantVerdict} />
          )}
        </AnimatePresence>

        {/* XIII Pillar cards — 2 cols on mobile, 3 on md */}
        <div>
          <SectionLabel>The XIII Pillars</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
            {pillars.map(pillar => (
              <PillarCard key={pillar.id} pillar={pillar} />
            ))}
          </div>
        </div>

        {/* Verdict feed */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Doctrine Verdicts</SectionLabel>
            <span className="text-[9px] font-display text-[var(--color-muted)]">
              {verdicts.length} total · last 15 shown
            </span>
          </div>
          <VerdictFeed verdicts={verdicts} />
        </div>

        {/* Severity breakdown */}
        <div className="card p-4">
          <SectionLabel>Severity Distribution</SectionLabel>
          <div className="space-y-2 mt-2">
            {[
              { label: 'Critical', value: severityCounts.critical, color: 'var(--color-red)',            max: 10 },
              { label: 'High',     value: severityCounts.high,     color: 'var(--color-orange, #f97316)', max: 20 },
              { label: 'Medium',   value: severityCounts.medium,   color: 'var(--color-amber)',           max: 30 },
              { label: 'Low',      value: severityCounts.low,      color: 'var(--color-green)',           max: 50 },
            ].map(({ label, value, color, max }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[9px] font-display text-[var(--color-muted)] w-12 flex-shrink-0">{label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-elevated)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                </div>
                <span className="mono text-[10px] w-6 text-right flex-shrink-0" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* All 13 laws quick reference */}
        <div className="card p-4">
          <SectionLabel>The Laws</SectionLabel>
          <div className="space-y-1.5 mt-2">
            {pillars.map(p => (
              <div key={p.id} className="flex items-start gap-2.5 py-1 border-b border-[var(--color-border)] last:border-0">
                <span
                  className="font-display font-bold text-[10px] w-7 flex-shrink-0 mt-0.5"
                  style={{ color: STATE_COLOR[p.state] }}
                >
                  {ROMAN[p.id - 1]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-display text-[var(--color-text)]">{p.name}</div>
                  <div className="text-[9px] text-[var(--color-muted)] italic">"{p.law}"</div>
                </div>
                <div
                  className="text-[8px] font-display flex-shrink-0 mt-0.5"
                  style={{ color: STATE_COLOR[p.state] }}
                >
                  {p.state.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
