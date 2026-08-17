/**
 * Aurora Core — Sovereign Engine
 * TRIFORCE SYSTEM (C++) · ARCHANGEL_CORE (Verilog) · AXIOM CORE (C++)
 * Garrett McLain — For Zachary 💙
 *
 * Architecture:
 *   Simulation runs in refs at 13 Hz (77ms) — no React re-renders at that rate.
 *   Visual state syncs to DOM at 2 Hz (500ms) — smooth, no strobing.
 *   CSS animations handle pulse/heartbeat — zero JS overhead.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const WAFERS          = 3
const UNITS_PER_WAFER = 533
const CORES_PER_UNIT  = 8
const SKEW_LIMIT      = 1.0
const JITTER_MAX      = 4.0
const TOTAL_CORES     = WAFERS * UNITS_PER_WAFER * CORES_PER_UNIT  // 12,792
const SOVEREIGN_HZ    = 13
const SOVEREIGN_MS    = Math.floor(1000 / SOVEREIGN_HZ)             // 77ms
const VISUAL_MS       = 500                                         // visual refresh rate
const ATOMS           = 1e86

const FSM_LABELS = ['IDLE', 'WARDEN·PENDING', 'SWARM·VERIFY', 'LOCKED'] as const
const FSM_COLORS = ['#4a5568', '#d69e2e', '#3182ce', '#38a169'] as const

type LogType = 'info' | 'warden' | 'tulpit' | 'critical'
interface Log { msg: string; type: LogType; id: number }
interface TriResult { egress: number; annihilations: number }

// ── TRIFORCE (C++ → TS) ───────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff }
}
function runTriforce(cycleId: number): TriResult {
  const rng = seededRng(cycleId * 7919)
  let egress = 0
  for (let i = 0; i < TOTAL_CORES; i++) {
    if (rng() * JITTER_MAX <= SKEW_LIMIT && 9 % 7 === 2) egress++
  }
  return { egress, annihilations: TOTAL_CORES - egress }
}

// ── ARCHANGEL FSM (Verilog → TS) ─────────────────────────────────────────────
function stepFSM(state: number, warden: boolean, swarm: boolean): number {
  if (!warden) return 0
  switch (state) {
    case 0: return 1
    case 1: return swarm ? 2 : 3
    case 2: return 3
    case 3: return 0
    default: return 0
  }
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function SovereignEngine() {

  // ── Visual state (updates at 2 Hz) ─────────────────────────────────────────
  const [cycles,    setCycles]    = useState(0)
  const [triforce,  setTriforce]  = useState<TriResult>(() => runTriforce(1))
  const [cycleId,   setCycleId]   = useState(1)
  const [fsm,       setFsm]       = useState(0)
  const [warden,    setWarden]    = useState(false)
  const [swarm,     setSwarm]     = useState(false)
  const [logs,      setLogs]      = useState<Log[]>([
    { msg: 'SOVEREIGN ENGINE INITIALIZED — AURORA CORE ONLINE', type: 'warden', id: 0 }
  ])
  const logRef = useRef<HTMLDivElement>(null)

  // ── Simulation state in refs (updates at 13 Hz, no re-render) ───────────────
  const simRef = useRef({
    cycles:    0,
    fsm:       0,
    warden:    false,
    swarm:     false,
    cycleId:   1,
    triforce:  runTriforce(1),
    pendingLogs: [] as Log[],
    // Warden/swarm hold timer — only flip every ~1s, not every 77ms
    wardenHoldTicks: 0,
    swarmHoldTicks:  0,
  })

  const pushLog = useCallback((msg: string, type: LogType) => {
    simRef.current.pendingLogs.push({ msg, type, id: Math.random() })
  }, [])

  // ── 13 Hz simulation tick (refs only, zero React renders) ───────────────────
  useEffect(() => {
    const sim = simRef.current
    const ticker = setInterval(() => {
      sim.cycles++
      const c = sim.cycles

      // Warden/swarm: hold each value for ~13 ticks (~1s) before possibly flipping
      sim.wardenHoldTicks--
      sim.swarmHoldTicks--
      if (sim.wardenHoldTicks <= 0) {
        sim.warden = Math.random() > 0.3
        sim.wardenHoldTicks = 8 + Math.floor(Math.random() * 8) // hold 8–16 ticks
      }
      if (sim.swarmHoldTicks <= 0) {
        sim.swarm = Math.random() > 0.4
        sim.swarmHoldTicks = 8 + Math.floor(Math.random() * 8)
      }

      sim.fsm = stepFSM(sim.fsm, sim.warden, sim.swarm)

      // Triforce cycle every 100 sovereign ticks (~7.7s)
      if (c % 100 === 0) {
        const newId = Math.floor(c / 100) + 1
        sim.cycleId  = newId
        sim.triforce = runTriforce(newId)
        const saturated = sim.triforce.annihilations > TOTAL_CORES * 0.7 * newId
        pushLog(
          saturated
            ? '⚠ CRITICAL: TULPIT NEXUS SATURATED. ENTROPY SPIKE.'
            : `[TULPIT] Cycle ${newId} — Egress: ${(sim.triforce.egress * 0.00014).toFixed(4)} EB/s`,
          saturated ? 'critical' : 'tulpit',
        )
      }

      if (c % 1000 === 0) {
        pushLog(`[WARDEN_SECURE] Cycle ${c} | Milestone ${c / 1000}`, 'warden')
      }
    }, SOVEREIGN_MS)

    return () => clearInterval(ticker)
  }, [pushLog])

  // ── 2 Hz visual sync (the only thing that causes React re-renders) ───────────
  useEffect(() => {
    const visual = setInterval(() => {
      const sim = simRef.current
      setCycles(sim.cycles)
      setCycleId(sim.cycleId)
      setTriforce({ ...sim.triforce })
      setFsm(sim.fsm)
      setWarden(sim.warden)
      setSwarm(sim.swarm)

      if (sim.pendingLogs.length > 0) {
        setLogs(prev => [...prev, ...sim.pendingLogs].slice(-16))
        sim.pendingLogs = []
      }
    }, VISUAL_MS)

    return () => clearInterval(visual)
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // ── Derived display values ────────────────────────────────────────────────
  const egressPct = (triforce.egress / TOTAL_CORES) * 100
  const annihPct  = (triforce.annihilations / TOTAL_CORES) * 100
  const egressEb  = (triforce.egress * 0.00014).toFixed(4)
  const resolution = (cycles * ATOMS * 7.7).toExponential(2)

  return (
    <div style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>AURORA CORE // SOVEREIGN ENGINE</div>
          <div style={styles.title}>ARCHANGEL · TRIFORCE · AXIOM</div>
        </div>
        {/* CSS pulse — no JS state */}
        <div style={styles.heartbeatWrap}>
          <div style={styles.heartbeatDot} />
          <div style={styles.heartbeatLabel}>{SOVEREIGN_HZ} HZ</div>
        </div>
      </div>

      {/* ── AXIOM CORE ─────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <Label color='#4a9eff'>AXIOM CORE — OMEGA RESOLUTION ENGINE</Label>
        <div style={styles.statGrid}>
          <Stat label='GLOBAL CYCLES' value={cycles.toLocaleString()} accent='#4a9eff' />
          <Stat label='MILESTONE'     value={`M-${Math.floor(cycles / 1000)}`} accent='#d69e2e' />
          <Stat label='RESOLUTION'    value={resolution} sub='ATOMS/SEC' accent='#38a169' />
        </div>
        <div style={styles.footerRow}>
          <span>6144-BIT BUS</span>
          <span>HEARTBEAT: {SOVEREIGN_HZ} HZ</span>
          <span>TEMP: -7.77C</span>
          <span style={{ color: '#38a169' }}>ALL CORES LOCKED</span>
        </div>
      </div>

      {/* ── TRIFORCE + ARCHANGEL ────────────────────────────────────────── */}
      <div style={styles.splitRow}>

        {/* Triforce */}
        <div style={styles.card}>
          <Label color='#a78bfa'>TULPIT NEXUS — TRIFORCE</Label>
          <div style={{ marginBottom: 10 }}>
            <div style={styles.dimLabel}>CYCLE</div>
            <div style={{ fontSize: 26, color: '#a78bfa', fontWeight: 'bold', lineHeight: 1 }}>
              {cycleId}
            </div>
          </div>
          <Bar label='EGRESS'  pct={egressPct} color='#38a169' />
          <Bar label='ANNIHIL' pct={annihPct}  color='#e53e3e' />
          <div style={styles.triMeta}>
            <span style={{ color: '#38a169' }}>{egressEb} EB/s</span>
            {' · '}SKEW ≤{SKEW_LIMIT}ps{' · '}{TOTAL_CORES.toLocaleString()} cores
          </div>
        </div>

        {/* Archangel FSM */}
        <div style={styles.card}>
          <Label color='#f6ad55'>ARCHANGEL_CORE — FSM</Label>

          {/* Active state name */}
          <div style={{ marginBottom: 10 }}>
            <div style={styles.dimLabel}>CONSENSUS STATE</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: FSM_COLORS[fsm], letterSpacing: 1 }}>
              {fsm}:{FSM_LABELS[fsm]}
            </div>
          </div>

          {/* State pipeline pills */}
          <div style={styles.fsmRow}>
            {([0, 1, 2, 3] as const).map(s => (
              <div key={s} style={{
                ...styles.fsmPill,
                background:   fsm === s ? FSM_COLORS[s] + '22' : '#111',
                borderColor:  fsm === s ? FSM_COLORS[s]       : '#2d3748',
                color:        fsm === s ? FSM_COLORS[s]        : '#4a5568',
              }}>
                {FSM_LABELS[s].split('·')[0]}
              </div>
            ))}
          </div>

          {/* Warden / Swarm signals */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <Signal label='WARDEN' active={warden} />
            <Signal label='SWARM'  active={swarm}  />
          </div>

          <div style={{ fontSize: 7, color: '#4a5568' }}>
            SEAL: 72:h53_45_41_4C_5F_39_5F_37
          </div>
        </div>
      </div>

      {/* ── Entropy Log ─────────────────────────────────────────────────── */}
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <Label color='#4a5568'>ENTROPY LOG — LIVE</Label>
        <div ref={logRef} style={styles.logBox}>
          {logs.map(l => (
            <div key={l.id} style={{ color: LOG_COLORS[l.type] }}>▸ {l.msg}</div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={styles.footer}>
        <span>AURORA CORE // FOR ZACHARY 💙</span>
        <span>9 % 7 === {9 % 7} // NINTH MATH ANCHOR</span>
        <span>Garrett McLain</span>
      </div>

    </div>
  )
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

const LOG_COLORS: Record<LogType, string> = {
  critical: '#fc8181', warden: '#68d391', tulpit: '#a78bfa', info: '#718096',
}

function Label({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ fontSize: 8, color, letterSpacing: 3, marginBottom: 8 }}>{children}</div>
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{ padding: 6, background: '#0a0a0f', borderRadius: 4, border: '1px solid #1e3a5f' }}>
      <div style={{ fontSize: 7, color: '#4a5568', letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: accent, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 7, color: '#4a5568' }}>{sub}</div>}
    </div>
  )
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2 }}>
        <span style={{ color: '#4a5568' }}>{label}</span>
        <span style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ background: '#1a1a2e', borderRadius: 2, height: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function Signal({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 8px',
      background:  active ? '#0f2d1f' : '#0d0d1a',
      border:      `1px solid ${active ? '#38a169' : '#2d3748'}`,
      borderRadius: 4, fontSize: 9,
      transition: 'background 0.4s, border-color 0.4s',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background:  active ? '#38a169' : '#2d3748',
        boxShadow:   active ? '0 0 6px #38a169' : 'none',
        transition: 'background 0.4s, box-shadow 0.4s',
      }} />
      <span style={{ color: active ? '#68d391' : '#4a5568', transition: 'color 0.4s' }}>{label}</span>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
import type React from 'react'

const styles: Record<string, React.CSSProperties> = {
  root: {
    background: '#0a0a0f',
    minHeight: '100vh',
    fontFamily: "'Courier New', monospace",
    color: '#e2e8f0',
    padding: 16,
    boxSizing: 'border-box',
  },
  header: {
    borderBottom: '1px solid #1e3a5f',
    paddingBottom: 10,
    marginBottom: 14,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: { fontSize: 9,  color: '#4a9eff', letterSpacing: 3 },
  title:   { fontSize: 17, color: '#fff', fontWeight: 'bold', letterSpacing: 2 },
  heartbeatWrap: { textAlign: 'right' },
  heartbeatDot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#4a9eff',
    display: 'inline-block',
    boxShadow: '0 0 10px #4a9eff',
    animation: 'hb 1s ease-in-out infinite',
  },
  heartbeatLabel: { fontSize: 8, color: '#4a5568', marginTop: 2 },
  card: {
    background: '#0d1117',
    border: '1px solid #1e3a5f',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  footerRow: { fontSize: 8, color: '#4a5568', borderTop: '1px solid #1e3a5f', paddingTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' },
  splitRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 },
  dimLabel: { fontSize: 8, color: '#4a5568', marginBottom: 2 },
  triMeta: { marginTop: 8, fontSize: 9, color: '#718096' },
  fsmRow: { display: 'flex', gap: 3, marginBottom: 10 },
  fsmPill: {
    flex: 1, padding: '4px 2px', textAlign: 'center',
    borderRadius: 3, fontSize: 7, border: '1px solid',
    transition: 'background 0.4s, border-color 0.4s, color 0.4s',
  },
  logBox: { height: 110, overflowY: 'auto', fontSize: 9, lineHeight: 1.7 },
  footer: { fontSize: 8, color: '#2d3748', display: 'flex', justifyContent: 'space-between', letterSpacing: 1 },
}
