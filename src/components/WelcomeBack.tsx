import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Zap, Gauge, Bot, ArrowRight } from 'lucide-react'

// Bump this when there's something worth resurfacing the card for again.
const VERSION = 'v2-clerk-relay-lock'
const STORAGE_KEY = 'aurora_whats_new_seen'

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    color: 'var(--color-cyan)',
    title: 'Real, secure sign-in',
    body: 'Accounts now run on proper authentication — no more shared passwords. God, Admin, Viewer, and Guest each get exactly the access they should.',
  },
  {
    icon: Zap,
    color: '#ff6b35',
    title: 'Relay controls, locked down',
    body: "Generator, shore power, HVAC, and propane switches now require an Admin or God login — they're physical hardware, not a toggle anyone should reach.",
  },
  {
    icon: Gauge,
    color: 'var(--color-green)',
    title: 'Faster everywhere',
    body: 'Pages load on demand instead of all at once, and live readings now stay in sync across every panel instead of drifting independently.',
  },
  {
    icon: Bot,
    color: 'var(--color-purple)',
    title: 'JARVIS is online',
    body: "A voice-ready AI copilot with live awareness of your whole system — energy, biometrics, environment — reachable from anywhere in the app.",
  },
]

export function WelcomeBack() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== VERSION) setShow(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, VERSION)
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="card aurora-gradient relative w-full max-w-lg p-6 md:p-8 z-10"
          >
            <div className="text-3xl mb-3">💙</div>
            <h2 className="display font-black text-2xl text-[var(--color-text)] mb-1.5">
              Thanks for your <span className="gradient-text-aurora">patience</span>.
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-6">
              Aurora Core took a while to come back online — we used the time to get the
              foundations right instead of rushing them. Here's what changed.
            </p>

            <div className="space-y-3 mb-6">
              {HIGHLIGHTS.map(h => (
                <div key={h.title} className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{ borderColor: h.color + '40', backgroundColor: h.color + '15' }}
                  >
                    <h.icon className="w-4 h-4" style={{ color: h.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-display font-bold text-[var(--color-text)]">{h.title}</div>
                    <div className="text-xs text-[var(--color-muted)] leading-relaxed mt-0.5">{h.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              onClick={dismiss}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl display font-bold text-sm transition-all"
              style={{ background: 'linear-gradient(135deg, #00ffc8, #00c89b)', color: '#020508' }}
            >
              Let's go <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
