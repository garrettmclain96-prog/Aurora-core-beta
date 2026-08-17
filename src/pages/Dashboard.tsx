import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'wouter'
import { Bell, Settings } from 'lucide-react'
import { NeuralCore } from '../components/NeuralCore'
import { AuroraIntelligence } from '../components/AuroraIntelligence'
import { HealthPanel } from '../components/HealthPanel'
import { EnergyPanel } from '../components/EnergyPanel'
import { RelayControl } from '../components/RelayControl'
import { EnvironmentPanel } from '../components/EnvironmentPanel'
import { PageTransition } from '../components/PageTransition'
import { useRealtime } from '../hooks/useRealtime'
import { useAuroraEngine } from '../hooks/useAuroraEngine'
import { useSystemAlerts } from '../lib/toast'
import { useAuth } from '../lib/auth'
import { initialAlerts } from '../lib/seed'

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <div className="text-right">
      <div className="mono text-sm font-bold text-[var(--color-text)]">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <div className="mono text-[9px] text-[var(--color-muted)]">{t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
    </div>
  )
}

export function Dashboard() {
  const live    = useRealtime()
  const engine  = useAuroraEngine(live)
  const { user, isGod } = useAuth()
  const [alertCount] = useState(initialAlerts.filter(a => !a.resolved).length)
  useSystemAlerts()

  // Derive system status from real engine state
  const statusText  = engine.signals.some(s => s.severity === 'alert')
    ? 'ALERT ACTIVE'
    : engine.signals.some(s => s.severity === 'warn')
    ? 'SIGNAL DETECTED'
    : 'ALL SYSTEMS NOMINAL'
  const statusColor = engine.signals.some(s => s.severity === 'alert')
    ? '#ff3366'
    : engine.signals.some(s => s.severity === 'warn')
    ? '#ffd60a'
    : '#39ff14'

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] flex-shrink-0"
          style={{ background: 'rgba(5,11,18,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-[#00ffc840] bg-[#00ffc808] flex items-center justify-center glow-teal flex-shrink-0">
              <span className="display font-black text-xs gradient-text-aurora">AC</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="display font-black text-sm text-[var(--color-text)] tracking-wide">AURORA CORE</span>
                <motion.span key={statusText}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mono text-[8px] px-1.5 py-0.5 rounded-full border"
                  style={{ color: statusColor, borderColor: statusColor + '40', background: statusColor + '08' }}>
                  {statusText}
                </motion.span>
                {isGod && <span className="mono text-[8px] px-1.5 py-0.5 rounded-full border border-[#ffd60a40] text-[#ffd60a] bg-[#ffd60a08]">⚡ GOD MODE</span>}
              </div>
              <div className="mono text-[9px] text-[var(--color-muted)]">Cognitive-Energy Ecosystem · {user?.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              {[
                { l: 'LOAD',    v: `${live.load}kW`,      c: '#ffd60a' },
                { l: 'SOLAR',   v: `${live.solar}kW`,     c: '#39ff14' },
                { l: 'BATTERY', v: `${live.batterySoc}%`, c: '#00ffc8' },
                { l: 'SCORE',   v: `${engine.score}`,     c: engine.score >= 80 ? '#39ff14' : engine.score >= 60 ? '#00ffc8' : '#ffd60a' },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-1">
                  <span className="mono text-[8px] text-[var(--color-dim)]">{s.l}</span>
                  <motion.span key={String(s.v)} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
                    className="mono text-[9px] font-bold" style={{ color: s.c }}>{s.v}</motion.span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/alerts" className="relative p-1.5 rounded-lg hover:bg-[var(--color-elevated)] transition-colors">
                <Bell className="w-4 h-4 text-[var(--color-muted)]" />
                {alertCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#ff3366] mono text-[7px] flex items-center justify-center text-white font-bold">{alertCount}</span>}
              </Link>
              <Link href="/settings" className="p-1.5 rounded-lg hover:bg-[var(--color-elevated)] transition-colors">
                <Settings className="w-4 h-4 text-[var(--color-muted)]" />
              </Link>
              <Clock />
            </div>
          </div>
        </div>

        {/* ── Desktop: 5-panel mission control ───────────────── */}
        <div className="hidden md:grid flex-1 min-h-0 overflow-hidden"
          style={{ gridTemplateColumns: '1fr 1.5fr 1fr', gridTemplateRows: '1fr 1fr' }}>

          {/* Health — top left */}
          <div className="border-r border-b border-[var(--color-border)] overflow-hidden" style={{ background: 'rgba(255,51,102,0.03)' }}>
            <HealthPanel metrics={live} />
          </div>

          {/* Neural Core — centre, spans both rows */}
          <div className="row-span-2 border-r border-[var(--color-border)] relative overflow-hidden flex flex-col">
            <div className="flex-1 relative min-h-0">
              <NeuralCore metrics={live} />
            </div>
          </div>

          {/* Energy — top right */}
          <div className="border-b border-[var(--color-border)] overflow-hidden" style={{ background: 'rgba(255,214,10,0.03)' }}>
            <EnergyPanel metrics={live} />
          </div>

          {/* Intelligence feed — bottom left */}
          <div className="border-r border-[var(--color-border)] overflow-hidden" style={{ background: 'rgba(0,255,200,0.02)' }}>
            <AuroraIntelligence metrics={live} />
          </div>

          {/* Environment — bottom right */}
          <div className="overflow-hidden" style={{ background: 'rgba(57,255,20,0.03)' }}>
            <EnvironmentPanel metrics={live} />
          </div>
        </div>

        {/* ── Mobile: vertical stack ──────────────────────────── */}
        <div className="md:hidden flex-1 overflow-y-auto divide-y divide-[var(--color-border)]" style={{ paddingBottom: 80 }}>
          {/* Score + decisions — first thing visible */}
          <div style={{ background: 'rgba(0,255,200,0.02)' }}>
            <AuroraIntelligence metrics={live} />
          </div>
          {/* Neural core */}
          <div style={{ height: 300, background: 'rgba(0,255,200,0.02)', position: 'relative' }}>
            <NeuralCore metrics={live} />
          </div>
          <div style={{ background: 'rgba(255,51,102,0.03)' }}>
            <HealthPanel metrics={live} />
          </div>
          <div style={{ background: 'rgba(255,214,10,0.03)' }}>
            <EnergyPanel metrics={live} />
          </div>
          <div style={{ background: 'rgba(155,93,229,0.03)' }}>
            <RelayControl metrics={live} />
          </div>
          <div style={{ background: 'rgba(57,255,20,0.03)' }}>
            <EnvironmentPanel metrics={live} />
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
