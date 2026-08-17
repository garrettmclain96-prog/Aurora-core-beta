/**
 * RelayControl — K1–K4 relay panel.
 * Shows live state, lets user toggle manually, shows Aurora auto-actions.
 * Calls /api/relay in production. Optimistic UI in demo mode.
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { LiveMetrics } from '../types'
import { useAuth } from '../lib/auth'

interface RelayDef {
  id:       'k1' | 'k2' | 'k3' | 'k4'
  label:    string
  icon:     string
  critical: boolean
  color:    string
}

const RELAYS: RelayDef[] = [
  { id: 'k1', label: 'Generator',   icon: '⚡', critical: true,  color: '#ff3366' },
  { id: 'k2', label: 'Shore Power', icon: '🔌', critical: true,  color: '#ffd60a' },
  { id: 'k3', label: 'HVAC',        icon: '❄️', critical: false, color: '#7df9ff' },
  { id: 'k4', label: 'Propane/AUX', icon: '🔥', critical: false, color: '#ff6b35' },
]

type RelayState = Record<'k1' | 'k2' | 'k3' | 'k4', boolean>

const DEFAULT_STATE: RelayState = { k1: false, k2: true, k3: true, k4: false }

interface RelayButtonProps {
  relay:    RelayDef
  state:    boolean
  pending:  boolean
  locked:   boolean
  onToggle: (id: RelayDef['id'], next: boolean) => void
}

function RelayButton({ relay, state, pending, locked, onToggle }: RelayButtonProps) {
  const activeColor = state ? relay.color : '#2a4a5a'
  return (
    <motion.button
      whileTap={{ scale: locked ? 1 : 0.95 }}
      onClick={() => !pending && !locked && onToggle(relay.id, !state)}
      title={locked ? 'Admin or god role required to control relays' : undefined}
      className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all disabled:opacity-50"
      style={{
        borderColor: state ? relay.color + '40' : 'var(--color-border)',
        background:  state ? relay.color + '10' : 'var(--color-surface)',
        cursor: locked ? 'not-allowed' : pending ? 'wait' : 'pointer',
        opacity: locked ? 0.55 : 1,
      }}
    >
      {/* Status ring */}
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-base transition-all"
          style={{
            borderColor: activeColor + (state ? 'c0' : '40'),
            background:  activeColor + (state ? '20' : '08'),
            boxShadow:   state ? `0 0 12px ${relay.color}40` : 'none',
          }}>
          {locked ? <Lock className="w-3.5 h-3.5" style={{ color: activeColor }} /> : <span>{relay.icon}</span>}
        </div>
        {/* Online indicator */}
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-surface)] transition-colors"
          style={{ backgroundColor: state ? relay.color : '#2a4a5a' }} />
      </div>
      <span className="mono text-[8px] font-bold tracking-wide" style={{ color: state ? relay.color : 'var(--color-dim)' }}>
        {relay.label}
      </span>
      <span className="mono text-[7px]" style={{ color: state ? relay.color + 'c0' : 'var(--color-dim)' }}>
        {pending ? '…' : state ? 'ON' : 'OFF'}
      </span>
      {relay.critical && (
        <span className="absolute top-1 left-1 mono text-[6px] text-[#ff3366] opacity-60">CRIT</span>
      )}
    </motion.button>
  )
}

export function RelayControl({ metrics }: { metrics: LiveMetrics }) {
  const { authedFetch, isAdmin } = useAuth()
  const [relayState, setRelayState] = useState<RelayState>(DEFAULT_STATE)
  const [pending, setPending]       = useState<RelayDef['id'] | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)

  const toggle = useCallback(async (id: RelayDef['id'], next: boolean) => {
    if (!isAdmin) return
    const relay = RELAYS.find(r => r.id === id)!
    // Optimistic update
    setRelayState(prev => ({ ...prev, [id]: next }))
    setPending(id)
    setLastAction(`${relay.label} → ${next ? 'ON' : 'OFF'}`)

    try {
      await authedFetch('/api/relay', {
        method: 'POST',
        body:   JSON.stringify({ relay: id, state: next, reason: 'manual' }),
      })
    } catch (e) {
      // Rollback on failure
      setRelayState(prev => ({ ...prev, [id]: !next }))
      setLastAction(e instanceof Error ? `Failed: ${e.message}` : `Failed: ${relay.label}`)
    } finally {
      setPending(null)
    }
  }, [isAdmin, authedFetch])

  const activeCount = Object.values(relayState).filter(Boolean).length

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="mono text-[8px] text-[var(--color-muted)] tracking-[0.2em] uppercase">Relay Control</span>
        <span className="mono text-[8px] text-[var(--color-teal)] ml-auto">{activeCount}/4 active</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {RELAYS.map(r => (
          <RelayButton key={r.id} relay={r} state={relayState[r.id]}
            pending={pending === r.id} locked={!isAdmin} onToggle={toggle} />
        ))}
      </div>

      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mono text-[8px] text-[var(--color-teal)] px-2 py-1 rounded border border-[var(--color-teal)]/20 bg-[var(--color-teal)]/05"
          >
            ✓ {lastAction}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
