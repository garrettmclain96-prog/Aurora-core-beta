import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'warning' | 'error' | 'info'
type Toast = { id: string; type: ToastType; title: string; message?: string }

type ToastCtx = { toast: (t: Omit<Toast, 'id'>) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function useToast() { return useContext(Ctx) }

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
}
const COLORS = {
  success: { border: 'oklch(0.74 0.17 145 / 0.5)', text: 'var(--color-green)',  bg: 'oklch(0.74 0.17 145 / 0.08)' },
  warning: { border: 'oklch(0.80 0.17 72 / 0.5)',  text: 'var(--color-amber)',  bg: 'oklch(0.80 0.17 72 / 0.08)'  },
  error:   { border: 'oklch(0.65 0.22 25 / 0.5)',  text: 'var(--color-red)',    bg: 'oklch(0.65 0.22 25 / 0.08)'  },
  info:    { border: 'oklch(0.82 0.16 196 / 0.5)', text: 'var(--color-cyan)',   bg: 'oklch(0.82 0.16 196 / 0.08)' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(x => x.id !== id))

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = ICONS[t.type]
            const c = COLORS[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="pointer-events-auto rounded-xl border p-3.5 flex items-start gap-3 shadow-lg backdrop-blur-sm"
                style={{ borderColor: c.border, backgroundColor: `color-mix(in oklch, var(--color-surface) 90%, transparent)`, background: 'var(--color-surface)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: c.text }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-display font-bold text-[var(--color-text)]">{t.title}</div>
                  {t.message && <div className="text-[10px] text-[var(--color-muted)] mt-0.5 leading-relaxed">{t.message}</div>}
                </div>
                <button onClick={() => dismiss(t.id)} className="text-[var(--color-dim)] hover:text-[var(--color-muted)] flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

// Simulated system alerts — fires periodically
export function useSystemAlerts() {
  const { toast } = useToast()
  useEffect(() => {
    const alerts = [
      { type: 'info'    as const, title: 'Peak Shave Active',       message: 'Battery buffer engaged — saving $0.18/hr' },
      { type: 'success' as const, title: 'Solar Peak Detected',     message: 'Output reached 4.2 kW — optimal conditions' },
      { type: 'warning' as const, title: 'Agent Conflict Resolved', message: 'Energy vs Behavior at 18:00 — arbitrated' },
      { type: 'info'    as const, title: 'L7 Retraining Complete',  message: 'RMSE improved 0.34 → 0.28 kWh' },
      { type: 'success' as const, title: 'HRV Optimal',             message: 'Stress index LOW — comfort mode active' },
    ]
    let i = 0
    const show = () => { toast(alerts[i % alerts.length]); i++ }
    const first = setTimeout(show, 8000)
    const id = setInterval(show, 45000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [toast])
}
