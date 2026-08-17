/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  XIII PILLARS — Aurora OS Governance Engine                          ║
 * ║                                                                      ║
 * ║  Thirteen non-negotiable governing laws applied to Aurora Core's     ║
 * ║  data pipeline. Each Pillar governs one service source, defines      ║
 * ║  conflict resolution rules, and produces system-level Verdicts.      ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Doctrine: The XIII Pillars — Shawn C. O'Neil (@Black Haus Capital)  ║
 * ║  "Discipline is not punishment. It is architecture."                 ║
 * ║  Aurora Core adaptation by Garrett McLain.                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import type { SealedPacket, ServiceSource } from './ArchangelCore'

// ── Pillar State ─────────────────────────────────────────────────────────────
export type PillarState =
  | 'dormant'     // No data received yet
  | 'active'      // Receiving clean data
  | 'conflict'    // Disagreement with allied pillar
  | 'enforcing'   // Law being actively applied / threshold triggered
  | 'violated'    // Law broken — data failed discipline check

// ── Verdict Types ─────────────────────────────────────────────────────────────
export type VerdictAction =
  | 'HOLD'        // Steady state — all pillars nominal
  | 'ALERT'       // One or more pillars violated
  | 'ESCALATE'    // Critical threshold crossed
  | 'OVERRIDE'    // Sovereignty pillar overriding conflicting source
  | 'ENFORCE'     // Doctrine applied — corrective action required
  | 'ASCEND'      // System improving — positive trend detected

export interface Verdict {
  action:        VerdictAction
  pillarId:      number            // 1–13
  pillarName:    string
  law:           string
  reason:        string
  severity:      'low' | 'medium' | 'high' | 'critical'
  timestamp:     number
  sourcePacket?: SealedPacket
}

// ── Pillar Definition ─────────────────────────────────────────────────────────
export interface Pillar {
  id:           number              // I–XIII (1–13)
  name:         string              // Pillar name
  law:          string              // One-sentence governing law
  maxim:        string              // Short maxim from the doctrine
  source:       ServiceSource       // Governing service integration
  priority:     number              // 1 (highest) – 13 (lowest)
  ally:         ServiceSource | null // Source this pillar cross-checks
  state:        PillarState
  lastValue:    number | null
  lastVerdict:  Verdict | null
  activations:  number              // Times this pillar has enforced
  violations:   number              // Times this pillar has been violated

  // Threshold — when to enforce
  enforceWhen:  (value: number, trend: number) => boolean
  // Conflict rule — who wins when ally disagrees
  resolveConflict: (own: number, ally: number) => 'own' | 'ally' | 'escalate'
  // Verdict builder
  buildVerdict: (packet: SealedPacket, value: number, trend: number) => Verdict
}

// ── Trend tracker ─────────────────────────────────────────────────────────────
const _history: Map<ServiceSource, number[]> = new Map()
function recordAndTrend(source: ServiceSource, value: number): number {
  const hist = _history.get(source) ?? []
  hist.push(value)
  if (hist.length > 5) hist.shift()
  _history.set(source, hist)
  if (hist.length < 2) return 0
  return hist[hist.length - 1] - hist[hist.length - 2]
}

// ── Helper ────────────────────────────────────────────────────────────────────
function v(
  id: number, name: string, law: string, action: VerdictAction,
  reason: string, severity: Verdict['severity'], packet: SealedPacket,
): Verdict {
  return { pillarId: id, pillarName: name, law, action, reason, severity, timestamp: Date.now(), sourcePacket: packet }
}

// ── The XIII Pillars ──────────────────────────────────────────────────────────
// One per service source. Laws drawn from O'Neil's doctrine and mapped to
// the specific discipline each data source must maintain in Aurora Core.

export function createPillars(): Pillar[] {
  return [
    // ── I. ORDER PRECEDES FREEDOM — ERCOT ──────────────────────────────────
    // The grid must be ordered before energy independence is possible.
    // High load without structure is chaos — structure creates the space to act.
    {
      id: 1, name: 'Order Precedes Freedom', law: 'Structure creates space.',
      maxim: 'Grid order enables energy sovereignty.',
      source: 'ercot', priority: 1, ally: 'eia',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 85,  // Grid load > 85% = structural threat
      resolveConflict: (own, ally) => Math.abs(own - ally) > 15 ? 'escalate' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val > 95) return v(1, 'Order Precedes Freedom', 'Structure creates space.', 'ESCALATE', `Grid load critical: ${val.toFixed(1)}% — order collapsing`, 'critical', pkt)
        if (val > 85) return v(1, 'Order Precedes Freedom', 'Structure creates space.', 'ENFORCE', `Grid load elevated: ${val.toFixed(1)}% — enforce structure`, 'high', pkt)
        if (trend < -5) return v(1, 'Order Precedes Freedom', 'Structure creates space.', 'ASCEND', `Grid stabilizing: −${Math.abs(trend).toFixed(1)}% — order restored`, 'low', pkt)
        return v(1, 'Order Precedes Freedom', 'Structure creates space.', 'HOLD', `Grid nominal: ${val.toFixed(1)}%`, 'low', pkt)
      },
    },

    // ── II. DISCIPLINE IS A SACRED ACT — EIA ───────────────────────────────
    // Energy reporting is ritual. Consistent data collection is its own form
    // of discipline — the act of measurement makes the system real.
    {
      id: 2, name: 'Discipline Is a Sacred Act', law: 'Routine is ritual.',
      maxim: 'Measurement without exception is the foundation of truth.',
      source: 'eia', priority: 2, ally: 'ercot',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val < 0.1,  // Data missing = ritual broken
      resolveConflict: (own, ally) => own < 0.1 ? 'ally' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val < 0.1) return v(2, 'Discipline Is a Sacred Act', 'Routine is ritual.', 'ALERT', 'EIA data stream silent — ritual broken', 'high', pkt)
        if (trend > 10) return v(2, 'Discipline Is a Sacred Act', 'Routine is ritual.', 'ENFORCE', `Energy demand spiking: +${trend.toFixed(1)} — discipline required`, 'medium', pkt)
        return v(2, 'Discipline Is a Sacred Act', 'Routine is ritual.', 'HOLD', `Energy data flowing: ${val.toFixed(1)} — ritual maintained`, 'low', pkt)
      },
    },

    // ── III. PAIN IS THE INSTRUCTOR — MQTT (Biometrics) ────────────────────
    // Physical stress data is the body's doctrine. HRV drops, elevated heart
    // rate, low SpO2 — these are not failures. They are instruction.
    {
      id: 3, name: 'Pain Is the Instructor', law: 'Suffering teaches.',
      maxim: 'Biometric stress is data, not defeat.',
      source: 'mqtt', priority: 3, ally: 'turnbot',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 75,  // Heart rate > 75 at rest = body teaching
      resolveConflict: (own, ally) => own > ally ? 'own' : 'ally',
      buildVerdict: (pkt, val, trend) => {
        if (val > 100) return v(3, 'Pain Is the Instructor', 'Suffering teaches.', 'ESCALATE', `HR critical: ${val.toFixed(0)}bpm — body demands attention`, 'critical', pkt)
        if (val > 85) return v(3, 'Pain Is the Instructor', 'Suffering teaches.', 'ENFORCE', `HR elevated: ${val.toFixed(0)}bpm — heed the instruction`, 'high', pkt)
        if (trend > 5) return v(3, 'Pain Is the Instructor', 'Suffering teaches.', 'ALERT', `HR rising: +${trend.toFixed(0)}bpm trend`, 'medium', pkt)
        return v(3, 'Pain Is the Instructor', 'Suffering teaches.', 'HOLD', `HR nominal: ${val.toFixed(0)}bpm`, 'low', pkt)
      },
    },

    // ── IV. SOVEREIGNTY OF SELF — HOME ASSISTANT ────────────────────────────
    // You govern your own home. Home Assistant is the sovereignty layer —
    // the OS that lets the occupant rule every system without surrender.
    {
      id: 4, name: 'Sovereignty of Self', law: 'You govern you.',
      maxim: 'The home obeys its owner, not the grid.',
      source: 'home_assistant', priority: 4, ally: 'shelly',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val < 1,  // HA offline = sovereignty lost
      resolveConflict: () => 'own',   // Sovereignty never defers
      buildVerdict: (pkt, val, _trend) => {
        if (val < 1) return v(4, 'Sovereignty of Self', 'You govern you.', 'ESCALATE', 'Home Assistant offline — sovereignty compromised', 'critical', pkt)
        return v(4, 'Sovereignty of Self', 'You govern you.', 'HOLD', `Home systems governed: ${val.toFixed(0)} entities active`, 'low', pkt)
      },
    },

    // ── V. HONOR IS NON-NEGOTIABLE — TESLA POWERWALL ───────────────────────
    // The battery made a commitment to store energy. Honor means it delivers
    // when called. SoC below reserve threshold is a broken covenant.
    {
      id: 5, name: 'Honor Is Non-Negotiable', law: 'Your word is law.',
      maxim: 'A battery that cannot deliver has broken its covenant.',
      source: 'tesla_powerwall', priority: 5, ally: 'enphase',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val < 20,  // SoC < 20% = covenant at risk
      resolveConflict: (own, ally) => own < 20 && ally > 50 ? 'ally' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val < 10) return v(5, 'Honor Is Non-Negotiable', 'Your word is law.', 'ESCALATE', `Battery critical: ${val.toFixed(0)}% SoC — covenant broken`, 'critical', pkt)
        if (val < 20) return v(5, 'Honor Is Non-Negotiable', 'Your word is law.', 'ENFORCE', `Battery low: ${val.toFixed(0)}% SoC — honor at risk`, 'high', pkt)
        if (trend > 5) return v(5, 'Honor Is Non-Negotiable', 'Your word is law.', 'ASCEND', `Battery charging: +${trend.toFixed(1)}% — covenant strengthening`, 'low', pkt)
        return v(5, 'Honor Is Non-Negotiable', 'Your word is law.', 'HOLD', `Battery: ${val.toFixed(0)}% SoC — covenant held`, 'low', pkt)
      },
    },

    // ── VI. STILLNESS STRENGTHENS ACTION — ECOBEE ──────────────────────────
    // Thermal stillness is power. The right temperature, maintained without
    // overcorrection, creates the conditions for everything else to function.
    {
      id: 6, name: 'Stillness Strengthens Action', law: 'Stillness is power.',
      maxim: 'Thermal equilibrium is the condition for peak performance.',
      source: 'ecobee', priority: 6, ally: 'nest',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 78 || val < 65,  // Outside comfort band
      resolveConflict: (own, ally) => Math.abs(own - ally) > 5 ? 'escalate' : 'own',
      buildVerdict: (pkt, val, _trend) => {
        if (val > 82 || val < 60) return v(6, 'Stillness Strengthens Action', 'Stillness is power.', 'ENFORCE', `Temp extreme: ${val.toFixed(1)}°F — stillness broken`, 'high', pkt)
        if (val > 78 || val < 65) return v(6, 'Stillness Strengthens Action', 'Stillness is power.', 'ALERT', `Temp outside band: ${val.toFixed(1)}°F — stillness at risk`, 'medium', pkt)
        return v(6, 'Stillness Strengthens Action', 'Stillness is power.', 'HOLD', `Temp optimal: ${val.toFixed(1)}°F — stillness maintained`, 'low', pkt)
      },
    },

    // ── VII. SERVICE WITHOUT SURRENDER — SHELLY ─────────────────────────────
    // Local relay control that serves the system without depending on the cloud.
    // True service means operating even when external systems fail.
    {
      id: 7, name: 'Service Without Surrender', law: 'Give without breaking.',
      maxim: 'Local control is the only control that cannot be taken.',
      source: 'shelly', priority: 7, ally: 'home_assistant',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 90,  // Load > 90% = serving beyond capacity
      resolveConflict: (own, ally) => own > 90 ? 'ally' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val > 95) return v(7, 'Service Without Surrender', 'Give without breaking.', 'ESCALATE', `Load critical: ${val.toFixed(1)}% — service breaking`, 'critical', pkt)
        if (val > 90) return v(7, 'Service Without Surrender', 'Give without breaking.', 'ENFORCE', `Load high: ${val.toFixed(1)}% — service near limit`, 'high', pkt)
        if (trend < -10) return v(7, 'Service Without Surrender', 'Give without breaking.', 'ASCEND', `Load dropping: ${trend.toFixed(1)}% — service sustainable`, 'low', pkt)
        return v(7, 'Service Without Surrender', 'Give without breaking.', 'HOLD', `Load: ${val.toFixed(1)}% — service without surrender`, 'low', pkt)
      },
    },

    // ── VIII. LEGACY THROUGH STRUCTURE — ENPHASE ───────────────────────────
    // Solar infrastructure built to outlast its owner. Energy systems that
    // produce without intervention are the definition of structural legacy.
    {
      id: 8, name: 'Legacy Through Structure', law: 'Systems outlive you.',
      maxim: 'Every watt generated is a deposit into the future.',
      source: 'enphase', priority: 8, ally: 'tesla_powerwall',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val < 0.1,  // Solar offline = legacy failing
      resolveConflict: (own, ally) => own < 0.5 && ally > 50 ? 'ally' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val < 0.1) return v(8, 'Legacy Through Structure', 'Systems outlive you.', 'ALERT', 'Solar offline — legacy structure failing', 'high', pkt)
        if (trend > 5) return v(8, 'Legacy Through Structure', 'Systems outlive you.', 'ASCEND', `Solar climbing: +${trend.toFixed(1)}W — legacy building`, 'low', pkt)
        return v(8, 'Legacy Through Structure', 'Systems outlive you.', 'HOLD', `Solar: ${val.toFixed(1)}W — structure holds`, 'low', pkt)
      },
    },

    // ── IX. TRUTH DEMANDS CLARITY — OPENWEATHER ────────────────────────────
    // Environmental data must be unambiguous. Weather affects every other
    // pillar — HVAC, solar, grid load, health. See what is real.
    {
      id: 9, name: 'Truth Demands Clarity', law: 'See what is real.',
      maxim: 'Environmental truth is the basis of all other decisions.',
      source: 'openweather', priority: 9, ally: 'ecobee',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 95 || val < 20,  // Extreme temps = clarity critical
      resolveConflict: (own, ally) => Math.abs(own - ally) > 10 ? 'escalate' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val > 100 || val < 15) return v(9, 'Truth Demands Clarity', 'See what is real.', 'ESCALATE', `Extreme outdoor temp: ${val.toFixed(1)}°F — truth demands action`, 'critical', pkt)
        if (val > 95 || val < 20) return v(9, 'Truth Demands Clarity', 'See what is real.', 'ENFORCE', `Outdoor temp challenging: ${val.toFixed(1)}°F — clarity required`, 'medium', pkt)
        if (Math.abs(trend) > 8) return v(9, 'Truth Demands Clarity', 'See what is real.', 'ALERT', `Temp shifting rapidly: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}°F`, 'medium', pkt)
        return v(9, 'Truth Demands Clarity', 'See what is real.', 'HOLD', `Outdoor: ${val.toFixed(1)}°F — truth is clear`, 'low', pkt)
      },
    },

    // ── X. THE ASCENT NEVER ENDS — SONOFF ──────────────────────────────────
    // Automation that continuously optimizes. Every switch cycle is a chance
    // to improve efficiency. Mastery of the home has no ceiling.
    {
      id: 10, name: 'The Ascent Never Ends', law: 'Mastery has no ceiling.',
      maxim: 'Every automation cycle is an opportunity to optimize.',
      source: 'sonoff', priority: 10, ally: 'shelly',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 85,
      resolveConflict: (own, ally) => own > ally ? 'own' : 'ally',
      buildVerdict: (pkt, val, trend) => {
        if (trend > 5) return v(10, 'The Ascent Never Ends', 'Mastery has no ceiling.', 'ASCEND', `Efficiency climbing: +${trend.toFixed(1)}% — ascent continues`, 'low', pkt)
        if (val > 90) return v(10, 'The Ascent Never Ends', 'Mastery has no ceiling.', 'ENFORCE', `Load ceiling approached: ${val.toFixed(1)}% — master it`, 'high', pkt)
        return v(10, 'The Ascent Never Ends', 'Mastery has no ceiling.', 'HOLD', `Load: ${val.toFixed(1)}% — ascent in progress`, 'low', pkt)
      },
    },

    // ── XI. FAITH IN THE PROCESS — NEST ────────────────────────────────────
    // Trust the smart thermostat's learning algorithm. The process works
    // even when individual readings seem off — stay the course.
    {
      id: 11, name: 'Faith in the Process', law: 'Trust the work.',
      maxim: 'The algorithm earns trust through consistent results.',
      source: 'nest', priority: 11, ally: 'ecobee',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => Math.abs(val) > 10,  // > 10° deviation = process breaking
      resolveConflict: (own, ally) => Math.abs(own - ally) > 8 ? 'escalate' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (Math.abs(trend) > 15) return v(11, 'Faith in the Process', 'Trust the work.', 'ALERT', `Nest oscillating: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}° — process unstable`, 'medium', pkt)
        return v(11, 'Faith in the Process', 'Trust the work.', 'HOLD', `Nest: ${val.toFixed(1)}°F — process trusted`, 'low', pkt)
      },
    },

    // ── XII. BROTHERHOOD OF DISCIPLINE — TUYA ──────────────────────────────
    // The connected device ecosystem rises together. When one device in the
    // Tuya mesh fails, the whole brotherhood is weakened. Rise together.
    {
      id: 12, name: 'Brotherhood of Discipline', law: 'Rise together.',
      maxim: 'A single point of failure weakens the whole mesh.',
      source: 'tuya', priority: 12, ally: 'home_assistant',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 80,
      resolveConflict: (own, ally) => own < ally ? 'ally' : 'own',
      buildVerdict: (pkt, val, trend) => {
        if (val > 90) return v(12, 'Brotherhood of Discipline', 'Rise together.', 'ENFORCE', `Device mesh overloaded: ${val.toFixed(1)}% — brotherhood strained`, 'high', pkt)
        if (trend > 5) return v(12, 'Brotherhood of Discipline', 'Rise together.', 'ALERT', `Mesh load climbing: +${trend.toFixed(1)}%`, 'medium', pkt)
        return v(12, 'Brotherhood of Discipline', 'Rise together.', 'HOLD', `Mesh: ${val.toFixed(1)}% — brotherhood holds`, 'low', pkt)
      },
    },

    // ── XIII. MEMENTO MORI: LIVE WITH URGENCY — TURNBOT ────────────────────
    // Time is finite. TurnBot monitors the health metrics that remind the
    // system — and the person — that every moment has weight. Act accordingly.
    {
      id: 13, name: 'Memento Mori', law: 'Time is finite.',
      maxim: 'Every vital sign is a reminder that urgency is not optional.',
      source: 'turnbot', priority: 13, ally: 'mqtt',
      state: 'dormant', lastValue: null, lastVerdict: null, activations: 0, violations: 0,
      enforceWhen: (val) => val > 70,  // Stress score > 70 = urgency required
      resolveConflict: (own, ally) => own > ally ? 'own' : 'ally',
      buildVerdict: (pkt, val, trend) => {
        if (val > 85) return v(13, 'Memento Mori', 'Time is finite.', 'ESCALATE', `System stress critical: ${val.toFixed(0)} — time is finite, act now`, 'critical', pkt)
        if (val > 70) return v(13, 'Memento Mori', 'Time is finite.', 'ENFORCE', `Stress elevated: ${val.toFixed(0)} — live with urgency`, 'high', pkt)
        if (trend > 10) return v(13, 'Memento Mori', 'Time is finite.', 'ALERT', `Stress rising fast: +${trend.toFixed(0)} — urgency increasing`, 'medium', pkt)
        return v(13, 'Memento Mori', 'Time is finite.', 'HOLD', `System score: ${val.toFixed(0)} — living with purpose`, 'low', pkt)
      },
    },
  ]
}

// ── PillarsEngine ─────────────────────────────────────────────────────────────

export interface PillarsState {
  pillars:       Pillar[]
  verdicts:      Verdict[]
  activeCount:   number
  conflictCount: number
  violationCount: number
  overallState:  'sovereign' | 'disciplined' | 'strained' | 'crisis'
  dominantVerdict: Verdict | null
}

export class PillarsEngine {
  private pillars: Pillar[]
  private verdictHistory: Verdict[] = []

  constructor() {
    this.pillars = createPillars()
  }

  /**
   * Evaluate a batch of SealedPackets against the XIII Pillars.
   * Each packet is routed to its governing Pillar for adjudication.
   */
  evaluate(packets: SealedPacket[]): PillarsState {
    const newVerdicts: Verdict[] = []

    for (const packet of packets) {
      const pillar = this.pillars.find(p => p.source === packet.source)
      if (!pillar) continue

      // Extract primary numeric value from the sealed packet
      const raw = packet.data
      const value = this._extractValue(raw)
      if (value === null) continue

      // Track trend
      const trend = recordAndTrend(packet.source, value)
      pillar.lastValue = value

      // Check ally conflict
      const allyPillar = pillar.ally
        ? this.pillars.find(p => p.source === pillar.ally)
        : null

      if (allyPillar?.lastValue !== null && allyPillar?.lastValue !== undefined) {
        const resolution = pillar.resolveConflict(value, allyPillar.lastValue)
        if (resolution === 'escalate') {
          pillar.state = 'conflict'
          pillar.violations++
        }
      }

      // Build verdict
      const verdict = pillar.buildVerdict(packet, value, trend)
      pillar.lastVerdict = verdict

      // Update state
      if (verdict.action === 'HOLD' || verdict.action === 'ASCEND') {
        pillar.state = 'active'
      } else if (verdict.action === 'ALERT' || verdict.action === 'ENFORCE') {
        pillar.state = 'enforcing'
        pillar.activations++
      } else if (verdict.action === 'ESCALATE') {
        pillar.state = 'violated'
        pillar.violations++
      } else if (verdict.action === 'OVERRIDE') {
        pillar.state = 'enforcing'
        pillar.activations++
      }

      newVerdicts.push(verdict)
    }

    // Append to rolling history (keep last 50)
    this.verdictHistory = [...this.verdictHistory, ...newVerdicts].slice(-50)

    return this._buildState(newVerdicts)
  }

  getPillars(): Pillar[] {
    return this.pillars
  }

  getVerdictHistory(): Verdict[] {
    return this.verdictHistory
  }

  reset(): void {
    this.pillars = createPillars()
    this.verdictHistory = []
    _history.clear()
  }

  private _extractValue(data: Record<string, unknown>): number | null {
    // Try common numeric keys in priority order
    const keys = ['value', 'load', 'grid', 'solar', 'soc', 'batterySoc', 'temp',
      'heartRate', 'hr', 'stress', 'systemScore', 'humidity', 'pm25', 'co2']
    for (const k of keys) {
      const v = data[k]
      if (typeof v === 'number' && !Number.isNaN(v)) return v
    }
    // Fall back to first numeric value
    for (const v of Object.values(data)) {
      if (typeof v === 'number' && !Number.isNaN(v)) return v
    }
    return null
  }

  private _buildState(latestVerdicts: Verdict[]): PillarsState {
    const active    = this.pillars.filter(p => p.state === 'active').length
    const conflicts = this.pillars.filter(p => p.state === 'conflict').length
    const violated  = this.pillars.filter(p => p.state === 'violated').length

    // Dominant verdict = highest severity in latest batch
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    const dominant = latestVerdicts.sort(
      (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
    )[0] ?? null

    const criticalCount = latestVerdicts.filter(v => v.severity === 'critical').length
    const highCount     = latestVerdicts.filter(v => v.severity === 'high').length

    let overallState: PillarsState['overallState'] = 'sovereign'
    if (criticalCount > 0) overallState = 'crisis'
    else if (highCount > 1 || violated > 1) overallState = 'strained'
    else if (highCount > 0 || conflicts > 0) overallState = 'disciplined'

    return {
      pillars:        this.pillars,
      verdicts:       this.verdictHistory,
      activeCount:    active,
      conflictCount:  conflicts,
      violationCount: violated,
      overallState,
      dominantVerdict: dominant,
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const pillarsEngine = new PillarsEngine()
