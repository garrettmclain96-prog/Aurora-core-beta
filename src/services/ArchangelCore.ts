/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ARCHANGEL CORE — Aurora OS Data Pipeline Engine                     ║
 * ║                                                                      ║
 * ║  Pipeline:                                                           ║
 * ║  INGRESS → TW_GATE → TT_CRUCIBLE → TL_WARDEN →                     ║
 * ║  TOPHET_VOID → DETERMINISTIC_SEAL → AUDITOR_SWARM → CONSENSUS       ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Architecture inspired by ARCHANGEL_CORE (Verilog HDL) and          ║
 * ║  TriforceSystem (C++) — original concepts by Alexander Colclough     ║
 * ║  (@Lex-Col). Aurora Core adaptation by Garrett McLain.              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ── Service Sources ─────────────────────────────────────────────────────────

export type ServiceSource =
  | 'openweather'
  | 'eia'
  | 'ercot'
  | 'home_assistant'
  | 'shelly'
  | 'tuya'
  | 'tesla_powerwall'
  | 'enphase'
  | 'ecobee'
  | 'sonoff'
  | 'nest'
  | 'mqtt'
  | 'turnbot'

// ── Consensus States (mirrors Verilog 3-bit state machine) ─────────────────
// 0 = IDLE / RESET
// 1 = WARDEN_APPROVED  (single source validated)
// 2 = SWARM_AGREEMENT  (multi-source consensus reached)
// 3 = ENTROPY_SPIKE    (annihilation threshold exceeded)
export type ConsensusState = 0 | 1 | 2 | 3

// ── Core Types ──────────────────────────────────────────────────────────────

export interface ServicePayload {
  source: ServiceSource
  data: Record<string, unknown>
  timestamp: number // Unix ms
}

export interface SealedPacket {
  source: ServiceSource
  data: Record<string, unknown>
  sealHeader: string      // e.g. "SEAL_77:OPENWEATHER:CYC42"
  harmonic: boolean       // all 3 gates + warden passed
  consensusState: ConsensusState
  resonanceScore: number  // 0.0–1.0  (≥ 0.75 = "Golden Shard")
  timestamp: number
  cycleId: number
}

export interface PipelineTrace {
  cycleId: number
  source: ServiceSource
  stages: {
    ingress:    boolean
    twGate:     boolean
    ttCrucible: boolean
    tlWarden:   boolean
    tophetVoid: boolean  // true = flush fired this cycle
    seal:       boolean
    swarm:      boolean
  }
  resonanceScore: number
  isGoldenShard: boolean
  result: 'sealed' | 'annihilated'
}

export interface PipelineMetrics {
  totalAnnihilations: number
  successfulEgress:   number
  egressRate:         number        // 0.0–1.0
  consensusState:     ConsensusState
  lastCycleId:        number
  entropySpike:       boolean
  lastFlushAt:        number
}

// ── Architectural Constants ─────────────────────────────────────────────────
// Inspired by TriforceSystem (TIGHTENED) and ARCHANGEL_CORE HDL

const SKEW_LIMIT_MS      = 30_000   // Max data age: tightened from 60s → 30s
const JITTER_MAX_MS      = 4_000    // Chaos tolerance window (4.0ps analogue)
const WARDEN_ALIGNMENT   = 777      // TL_WARDEN magic constant (byte_alignment == 16'd777)
const FLUSH_INTERVAL_MS  = 32_000   // TOPHET_VOID flush period
const ANNIHILATION_CAP   = 0.70     // 70% failure rate → ENTROPY_SPIKE
const SWARM_WINDOW       = 10       // Rolling window of sealed packets for consensus
const SWARM_AGREEMENT    = 0.60     // 60% of sources must agree
const SWARM_TOLERANCE    = 0.10     // ±10% of median = "in agreement"

// ── Stage 1: JET_SMUGGLER_INGRESS ───────────────────────────────────────────
// Splits payload into two shards for parallel downstream validation.
// Mirrors: assign shard_a = payload[3071:0]; assign shard_b = payload[6143:3072]

interface ShardedPayload {
  shardA: [string, unknown][]
  shardB: [string, unknown][]
  phaseLocked: boolean
  original: ServicePayload
  cycleId: number
}

function jetSmugglerIngress(payload: ServicePayload, cycleId: number): ShardedPayload {
  const entries = Object.entries(payload.data) as [string, unknown][]
  const mid = Math.floor(entries.length / 2)
  return {
    shardA: entries.slice(0, mid),
    shardB: entries.slice(mid),
    phaseLocked: entries.length > 0,
    original: payload,
    cycleId,
  }
}

// ── Stage 2: TW_GATE (Temporal Gate) ────────────────────────────────────────
// Validates data freshness and shard divergence (payload has changed).
// gate_passed = (shard_a != shard_b); hardware_mute = 1'b0

interface GateResult {
  passed: boolean
  skewMs: number
}

function twGate(sharded: ShardedPayload): GateResult {
  const skewMs = Date.now() - sharded.original.timestamp + Math.random() * JITTER_MAX_MS
  const shardsDistinct =
    JSON.stringify(sharded.shardA) !== JSON.stringify(sharded.shardB)
  return {
    passed: skewMs <= SKEW_LIMIT_MS && shardsDistinct,
    skewMs,
  }
}

// ── Stage 3: TT_CRUCIBLE (Nonlinear Gate) ────────────────────────────────────
// Data integrity — at least one valid, non-null numeric/string value must exist.
// Original HDL: gate_passed = 1'b1 (always). Aurora: enforced on real service data.

function ttCrucible(sharded: ShardedPayload): boolean {
  const values = Object.values(sharded.original.data)
  return values.some(
    v => v !== null && v !== undefined && v !== '' && !Number.isNaN(v as number)
  )
}

// ── Stage 4: TL_WARDEN (Trinity Gate) ────────────────────────────────────────
// Alignment check. Mirrors: gate_passed = (byte_alignment == 16'd777).
// "Ninth Math remains the anchor": (9 % 7 == 2) is the always-true base condition.

function tlWarden(sharded: ShardedPayload): boolean {
  const keyCount  = Object.keys(sharded.original.data).length
  const ninthMath = (9 % 7) === 2   // Anchor — always true; mirrors the HDL constant
  const hasKeys   = keyCount >= 1
  const ceremonyBeat = sharded.cycleId % WARDEN_ALIGNMENT
  return ninthMath && hasKeys && ceremonyBeat >= 0
}

// ── Stage 5: TOPHET_VOID (Zeroize Unit) ──────────────────────────────────────
// Periodic stale-data flush. Fires tgl_reset at FLUSH_INTERVAL_MS.
// Mirrors: always @(posedge clk) tgl_reset <= 1'b0; flush on interval.

let _lastFlushAt = Date.now()

function tophetVoid(): { tglReset: boolean; lastFlushAt: number } {
  const now = Date.now()
  if (now - _lastFlushAt >= FLUSH_INTERVAL_MS) {
    _lastFlushAt = now
    return { tglReset: true, lastFlushAt: now }
  }
  return { tglReset: false, lastFlushAt: _lastFlushAt }
}

// ── Stage 6: DETERMINISTIC_SEAL ──────────────────────────────────────────────
// Creates the sealed packet header.
// "SEAL_77" decoded from original HDL: header_out = 72'h53_45_41_4C_5F_37_37

function deterministicSeal(
  payload: ServicePayload,
  cycleId: number,
  gateStatus: [boolean, boolean, boolean],
  wardenApproved: boolean
): { sealHeader: string; harmonicMatch: boolean } {
  const tglStatus    = gateStatus.filter(Boolean).length  // 0–3 gates passed
  const harmonicMatch = tglStatus === 3 && wardenApproved
  const sealHeader   = `SEAL_77:${payload.source.toUpperCase()}:CYC${cycleId}`
  return { sealHeader, harmonicMatch }
}

// ── Stage 7: AUDITOR_SWARM ────────────────────────────────────────────────────
// Multi-source consensus — do recent sealed packets agree on numeric values?
// Mirrors: agreement = warden_signal (simplified single-wire in HDL)

function auditorSwarm(recentSealed: Partial<SealedPacket>[], key = 'value'): boolean {
  if (recentSealed.length < 2) return false
  const nums = recentSealed
    .map(p => p.data?.[key])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (nums.length < 2) return false
  const sorted = [...nums].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const agreeing = nums.filter(
    v => median === 0 || Math.abs(v - median) / Math.abs(median) <= SWARM_TOLERANCE
  )
  return agreeing.length / nums.length >= SWARM_AGREEMENT
}

// ── Consensus State Machine ───────────────────────────────────────────────────
// Mirrors the always @(posedge pic_clk_13Hz) block in ARCHANGEL_CORE.

function nextConsensusState(
  current: ConsensusState,
  wardenApproved: boolean,
  swarmAgreement: boolean,
  tglReset: boolean,
): ConsensusState {
  if (tglReset) return 0
  switch (current) {
    case 0: return wardenApproved  ? 1 : 0
    case 1: return swarmAgreement  ? 2 : 1
    case 2: return 3
    case 3: return 0  // loop back to IDLE
    default: return 0
  }
}

// ── Resonance Scoring (TriforceSystem) ───────────────────────────────────────
// "Golden Shards" = top 25% quality (score ≥ 0.75).
// Derived from freshness, gate pass rate, and harmonic match bonus.

function computeResonance(
  skewMs: number,
  gatesPassedCount: number,
  harmonicMatch: boolean,
): number {
  const freshness     = Math.max(0, 1 - skewMs / SKEW_LIMIT_MS)
  const gateScore     = gatesPassedCount / 3
  const harmonicBonus = harmonicMatch ? 0.15 : 0
  return Math.min(1.0, freshness * 0.5 + gateScore * 0.35 + harmonicBonus)
}

// ── ArchangelCore Class ───────────────────────────────────────────────────────

export class ArchangelCore {
  private cycleId       = 0
  private recentSealed: Partial<SealedPacket>[] = []
  private metrics: PipelineMetrics = {
    totalAnnihilations: 0,
    successfulEgress:   0,
    egressRate:         0,
    consensusState:     0,
    lastCycleId:        0,
    entropySpike:       false,
    lastFlushAt:        Date.now(),
  }

  /**
   * Process a payload through the full pipeline with stage trace.
   * Returns SealedPacket + PipelineTrace on success, null packet on annihilation.
   */
  processWithTrace(payload: ServicePayload): { packet: SealedPacket | null; trace: PipelineTrace } {
    this.cycleId++
    this.metrics.lastCycleId = this.cycleId

    // Stage 1: Ingress
    const sharded   = jetSmugglerIngress(payload, this.cycleId)
    const ingressOk = sharded.phaseLocked

    // Stage 2: Temporal Gate
    const gate    = twGate(sharded)
    const twOk    = gate.passed

    // Stage 3: Crucible
    const crucibleOk = twOk ? ttCrucible(sharded) : false

    // Stage 4: Warden
    const wardenOk = crucibleOk ? tlWarden(sharded) : false

    // Stage 5: Void flush
    const { tglReset, lastFlushAt } = tophetVoid()
    this.metrics.lastFlushAt = lastFlushAt

    const gateStatus: [boolean, boolean, boolean] = [twOk, crucibleOk, wardenOk]
    const gatesPassedCount = gateStatus.filter(Boolean).length

    // Stage 6: Seal
    const { sealHeader, harmonicMatch } = deterministicSeal(
      payload, this.cycleId, gateStatus, wardenOk,
    )
    const sealOk = gatesPassedCount >= 2

    // Resonance + Golden Shard
    const resonanceScore = computeResonance(gate.skewMs, gatesPassedCount, harmonicMatch)
    const isGoldenShard  = resonanceScore >= 0.75

    // Stage 7: Swarm
    const swarmAgreement = auditorSwarm(this.recentSealed)

    // Update consensus state
    this.metrics.consensusState = nextConsensusState(
      this.metrics.consensusState,
      wardenOk,
      swarmAgreement,
      tglReset,
    )

    const trace: PipelineTrace = {
      cycleId: this.cycleId,
      source:  payload.source,
      stages: {
        ingress:    ingressOk,
        twGate:     twOk,
        ttCrucible: crucibleOk,
        tlWarden:   wardenOk,
        tophetVoid: tglReset,
        seal:       sealOk,
        swarm:      swarmAgreement,
      },
      resonanceScore,
      isGoldenShard,
      result: 'annihilated',
    }

    // Annihilation check (TriforceSystem entropy logic)
    if (!isGoldenShard || gatesPassedCount < 2) {
      this.metrics.totalAnnihilations++
      this._updateEgressRate()

      const threshold = ANNIHILATION_CAP * this.cycleId
      this.metrics.entropySpike = this.metrics.totalAnnihilations > threshold

      if (this.metrics.entropySpike) {
        // entropy spike surfaced via returned trace object
      }
      return { packet: null, trace }
    }

    // Successful egress
    this.metrics.successfulEgress++
    this._updateEgressRate()

    const packet: SealedPacket = {
      source:         payload.source,
      data:           payload.data,
      sealHeader,
      harmonic:       harmonicMatch,
      consensusState: this.metrics.consensusState,
      resonanceScore,
      timestamp:      payload.timestamp,
      cycleId:        this.cycleId,
    }

    this.recentSealed = [...this.recentSealed.slice(-(SWARM_WINDOW - 1)), packet]
    trace.result = 'sealed'

    return { packet, trace }
  }

  /** Batch process multiple payloads, returns sealed packets and all traces */
  processBatch(payloads: ServicePayload[]): {
    sealed: SealedPacket[]
    traces: PipelineTrace[]
  } {
    const sealed: SealedPacket[] = []
    const traces: PipelineTrace[] = []
    for (const p of payloads) {
      const { packet, trace } = this.processWithTrace(p)
      if (packet) sealed.push(packet)
      traces.push(trace)
    }
    return { sealed, traces }
  }

  getMetrics(): Readonly<PipelineMetrics> {
    return { ...this.metrics }
  }

  reset(): void {
    this.cycleId      = 0
    this.recentSealed = []
    _lastFlushAt      = Date.now()
    this.metrics = {
      totalAnnihilations: 0,
      successfulEgress:   0,
      egressRate:         0,
      consensusState:     0,
      lastCycleId:        0,
      entropySpike:       false,
      lastFlushAt:        Date.now(),
    }
  }

  private _updateEgressRate(): void {
    const total = this.metrics.successfulEgress + this.metrics.totalAnnihilations
    this.metrics.egressRate = total > 0 ? this.metrics.successfulEgress / total : 0
  }
}

// ── Singleton export for Aurora Core ─────────────────────────────────────────
export const archangelCore = new ArchangelCore()
