/**
 * Aurora Core — ARCHANGEL Panel
 * Live visualization of the ARCHANGEL_CORE data pipeline.
 *
 * Architecture inspired by ARCHANGEL_CORE (Verilog HDL) and
 * TriforceSystem (C++) — original concepts by Alexander Colclough (@Lex-Col).
 * Aurora Core adaptation by Garrett McLain.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition } from '../components/PageTransition'
import { PageHeader, SectionLabel } from '../components/Layout'
import { useRealtime } from '../hooks/useRealtime'
import { useArchangelCore } from '../hooks/useArchangelCore'
import type { PipelineTrace, ConsensusState } from '../services/ArchangelCore'

// ── Consensus labels ─────────────────────────────────────────────────────────
const CONSENSUS_LABEL: Record<ConsensusState, string> = {
  0: 'IDLE',
  1: 'WARDEN APPROVED',
  2: 'SWARM AGREEMENT',
  3: 'ENTROPY SPIKE',
}
const CONSENSUS_COLOR: Record<ConsensusState, string> = {
  0: 'var(--color-muted)',
  1: 'var(--color-cyan)',
  2: 'var(--color-green)',
  3: 'var(--color-red)',
}

// ── Pipeline stage definitions ────────────────────────────────────────────────
const STAGES = [
  { key: 'ingress',    label: 'JET_SMUGGLER\nINGRESS',  abbr: 'INGRESS'  },
  { key: 'twGate',     label: 'TW_GATE\nTemporal',       abbr: 'TW_GATE'  },
  { key: 'ttCrucible', label: 'TT_CRUCIBLE\nNonlinear',  abbr: 'CRUCIBLE' },
  { key: 'tlWarden',   label: 'TL_WARDEN\nTrinity',      abbr: 'WARDEN'   },
  { key: 'tophetVoid', label: 'TOPHET_VOID\nZeroize',    abbr: 'T-VOID'   },
  { key: 'seal',       label: 'DETERMINISTIC\nSEAL',     abbr: 'SEAL_77'  },
  { key: 'swarm',      label: 'AUDITOR\nSWARM',          abbr: 'SWARM'    },
] as const

type StageKey = typeof STAGES[number]['key']

// ── Sub-components ────────────────────────────────────────────────────────────

function ConsensusGauge({ state }: { state: ConsensusState }) {
  const color = CONSENSUS_COLOR[state]
  const label = CONSENSUS_LABEL[state]
  const pct   = (state / 3) * 100

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Consensus State</SectionLabel>
        <span className="text-[10px] font-display mono" style={{ color }}>
          {state}/3
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-elevated)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <div
        className="text-center font-display font-bold text-sm tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  )
}

function MetricTile({
  label, value, unit, color = 'var(--color-cyan)', spike = false,
}: {
  label: string; value: string | number; unit?: string; color?: string; spike?: boolean
}) {
  return (
    <div className={clsx('card p-3', spike && 'border-[var(--color-red)]/40 card-glow')}>
      <div className="text-[9px] font-display tracking-[0.12em] uppercase text-[var(--color-muted)] mb-1">
        {label}
      </div>
      <div className="flex items-end gap-1">
        <span className="mono text-xl font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-[10px] text-[var(--color-muted)] mb-0.5">{unit}</span>}
      </div>
    </div>
  )
}

function PipelineStageNode({
  stageKey, label, abbr, passed,
}: {
  stageKey: StageKey; label: string; abbr: string; passed: boolean | undefined
}) {
  const isFlush  = stageKey === 'tophetVoid'
  const color    = isFlush
    ? passed ? 'var(--color-amber)' : 'var(--color-muted)'
    : passed === undefined
      ? 'var(--color-muted)'
      : passed
        ? 'var(--color-green)'
        : 'var(--color-red)'

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <motion.div
        className="w-10 h-10 rounded-lg border flex items-center justify-center"
        style={{
          borderColor: color + '60',
          backgroundColor: color + '15',
        }}
        animate={{
          boxShadow: passed ? `0 0 8px ${color}55` : 'none',
        }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-[8px] font-display font-bold text-center leading-tight" style={{ color }}>
          {abbr.split('_').join('\n')}
        </span>
      </motion.div>
      <span className="text-[7px] font-display text-[var(--color-dim)] text-center leading-tight whitespace-pre-wrap">
        {label}
      </span>
    </div>
  )
}

function PipelineRow({ trace }: { trace: PipelineTrace }) {
  const isSealed = trace.result === 'sealed'
  const score    = trace.resonanceScore

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-display',
        isSealed
          ? 'border-[var(--color-green)]/20 bg-[var(--color-green)]/5'
          : 'border-[var(--color-red)]/20 bg-[var(--color-red)]/5',
      )}
    >
      {/* Status dot */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: isSealed ? 'var(--color-green)' : 'var(--color-red)' }}
      />

      {/* Source */}
      <span className="text-[var(--color-muted)] w-24 truncate flex-shrink-0">
        {trace.source.toUpperCase()}
      </span>

      {/* Stage dots */}
      <div className="flex gap-1 flex-1">
        {STAGES.map(s => {
          const ok    = trace.stages[s.key]
          const flush = s.key === 'tophetVoid'
          return (
            <div
              key={s.key}
              className="w-2 h-2 rounded-sm"
              title={s.abbr}
              style={{
                backgroundColor: flush
                  ? ok ? 'var(--color-amber)' : 'var(--color-elevated)'
                  : ok ? 'var(--color-green)' : 'var(--color-red)',
                opacity: ok ? 1 : 0.3,
              }}
            />
          )
        })}
      </div>

      {/* Resonance bar */}
      <div className="w-16 flex items-center gap-1.5 flex-shrink-0">
        <div className="flex-1 h-1 rounded-full bg-[var(--color-elevated)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${score * 100}%`,
              backgroundColor: score >= 0.75
                ? 'var(--color-green)'
                : score >= 0.5
                  ? 'var(--color-amber)'
                  : 'var(--color-red)',
            }}
          />
        </div>
        <span className="text-[9px] mono text-[var(--color-muted)]">
          {(score * 100).toFixed(0)}
        </span>
      </div>

      {/* Golden shard badge */}
      {trace.isGoldenShard && (
        <span className="text-[9px] font-display text-[var(--color-amber)] flex-shrink-0">✦</span>
      )}
    </motion.div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ArchangelPanel() {
  const liveMetrics   = useRealtime()
  const archangelState = useArchangelCore(liveMetrics)
  const { metrics, recentTraces, recentSealed } = archangelState

  // Compute last-cycle stage pass/fail from the most recent batch of traces
  const lastBatchStages = useMemo(() => {
    const batch = recentTraces.slice(-13)
    const result: Partial<Record<StageKey, boolean>> = {}
    for (const s of STAGES) {
      const vals = batch.map(t => t.stages[s.key])
      if (vals.length === 0) { result[s.key] = undefined; continue }
      result[s.key] = vals.some(Boolean)
    }
    return result
  }, [recentTraces])

  const goldenCount = recentSealed.filter(p => p.resonanceScore >= 0.75).length
  const lastSeal    = recentSealed[recentSealed.length - 1]

  return (
    <PageTransition>
      <PageHeader
        title="ARCHANGEL CORE"
        subtitle="Seven-stage data pipeline · INGRESS → TW_GATE → CRUCIBLE → WARDEN → T-VOID → SEAL_77 → SWARM"
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* Attribution banner */}
        <div className="card p-3 flex items-center gap-3 border-[oklch(0.82_0.16_196_/_0.3)]">
          <div className="w-7 h-7 rounded-md bg-[oklch(0.82_0.16_196_/_0.10)] border border-[oklch(0.82_0.16_196_/_0.35)] flex items-center justify-center flex-shrink-0">
            <span className="text-xs">⚙️</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-display font-bold text-[var(--color-cyan)] tracking-wider">
              ARCHANGEL CORE PIPELINE
            </div>
            <div className="text-[9px] text-[var(--color-muted)] mt-0.5 leading-snug">
              Architecture inspired by <span className="text-[var(--color-text)]">ARCHANGEL_CORE (Verilog HDL)</span> &amp;{' '}
              <span className="text-[var(--color-text)]">TriforceSystem (C++)</span> — original concepts by{' '}
              <span className="text-[var(--color-cyan)]">Alexander Colclough (@Lex-Col)</span>.
              Aurora Core adaptation by <span className="text-[var(--color-cyan)]">Garrett McLain</span>.
            </div>
          </div>
        </div>

        {/* Top metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Successful Egress"
            value={metrics.successfulEgress}
            color="var(--color-green)"
          />
          <MetricTile
            label="Annihilations"
            value={metrics.totalAnnihilations}
            color="var(--color-red)"
            spike={metrics.entropySpike}
          />
          <MetricTile
            label="Egress Rate"
            value={`${(metrics.egressRate * 100).toFixed(1)}`}
            unit="%"
            color={metrics.egressRate >= 0.7 ? 'var(--color-green)' : 'var(--color-amber)'}
          />
          <MetricTile
            label="Golden Shards ✦"
            value={goldenCount}
            color="var(--color-amber)"
          />
        </div>

        {/* Consensus gauge */}
        <ConsensusGauge state={metrics.consensusState} />

        {/* Pipeline stage visualization */}
        <div className="card p-4">
          <SectionLabel>Pipeline — Cycle {metrics.lastCycleId}</SectionLabel>
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
                <PipelineStageNode
                  stageKey={s.key}
                  label={s.label}
                  abbr={s.abbr}
                  passed={lastBatchStages[s.key]}
                />
                {i < STAGES.length - 1 && (
                  <div className="w-3 h-px bg-[var(--color-border)] flex-shrink-0 mt-[-14px]" />
                )}
              </div>
            ))}
          </div>

          {/* Stage legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {[
              { color: 'var(--color-green)', label: 'Passed' },
              { color: 'var(--color-red)',   label: 'Failed' },
              { color: 'var(--color-amber)', label: 'Flush' },
              { color: 'var(--color-muted)', label: 'Pending' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-[var(--color-muted)] font-display">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last sealed packet */}
        {lastSeal && (
          <div className="card p-4 border-[var(--color-green)]/20">
            <SectionLabel>Last Sealed Packet</SectionLabel>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display text-[var(--color-muted)]">Header</span>
                <span className="mono text-[11px] text-[var(--color-cyan)]">{lastSeal.sealHeader}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display text-[var(--color-muted)]">Source</span>
                <span className="mono text-[11px] text-[var(--color-text)]">{lastSeal.source.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display text-[var(--color-muted)]">Resonance</span>
                <span className="mono text-[11px]" style={{
                  color: lastSeal.resonanceScore >= 0.75 ? 'var(--color-amber)' : 'var(--color-cyan)',
                }}>
                  {(lastSeal.resonanceScore * 100).toFixed(1)}%
                  {lastSeal.resonanceScore >= 0.75 && ' ✦ GOLDEN SHARD'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display text-[var(--color-muted)]">Harmonic Match</span>
                <span className="mono text-[11px]" style={{
                  color: lastSeal.harmonic ? 'var(--color-green)' : 'var(--color-muted)',
                }}>
                  {lastSeal.harmonic ? '✓ MATCHED' : '— PARTIAL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-display text-[var(--color-muted)]">Consensus</span>
                <span className="mono text-[11px]" style={{ color: CONSENSUS_COLOR[lastSeal.consensusState] }}>
                  {CONSENSUS_LABEL[lastSeal.consensusState]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live trace feed */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Live Trace Feed</SectionLabel>
            <div className="flex items-center gap-3 text-[9px] font-display text-[var(--color-muted)]">
              <span>SRC · STAGES · RESONANCE</span>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 mb-1.5 text-[8px] font-display text-[var(--color-dim)] uppercase tracking-wider">
            <span className="w-1.5 flex-shrink-0" />
            <span className="w-24 flex-shrink-0">Source</span>
            <div className="flex gap-1 flex-1">
              {STAGES.map(s => (
                <span key={s.key} className="w-2 text-center" title={s.label}>{s.abbr[0]}</span>
              ))}
            </div>
            <span className="w-16 flex-shrink-0 text-right">Score</span>
            <span className="w-3 flex-shrink-0" />
          </div>

          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              {[...recentTraces].reverse().map(trace => (
                <PipelineRow key={`${trace.cycleId}-${trace.source}`} trace={trace} />
              ))}
            </AnimatePresence>
            {recentTraces.length === 0 && (
              <div className="text-center text-[var(--color-muted)] text-xs font-display py-8">
                Awaiting first cycle…
              </div>
            )}
          </div>
        </div>

        {/* Entropy spike alert */}
        <AnimatePresence>
          {metrics.entropySpike && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="card p-4 border-[var(--color-red)]/50 bg-[var(--color-red)]/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--color-red)] animate-pulse" />
                <div>
                  <div className="text-xs font-display font-bold text-[var(--color-red)] tracking-wider">
                    CRITICAL: TULPIT NEXUS SATURATED — ENTROPY SPIKE
                  </div>
                  <div className="text-[9px] text-[var(--color-muted)] mt-0.5">
                    Annihilation rate exceeded 70% threshold · Cycle {metrics.lastCycleId}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOPHET_VOID flush status */}
        <div className="card p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[var(--color-amber)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-display text-[var(--color-muted)] uppercase tracking-wider">
              TOPHET_VOID · Last Flush
            </div>
            <div className="mono text-[10px] text-[var(--color-text)] mt-0.5">
              {new Date(metrics.lastFlushAt).toLocaleTimeString()} · Interval: 32s
            </div>
          </div>
          <div className="text-[9px] font-display text-[var(--color-amber)]">ACTIVE</div>
        </div>

      </div>
    </PageTransition>
  )
}
