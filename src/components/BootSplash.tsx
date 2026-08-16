import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BOOT = [
  { ms: 300,  text: 'Initializing Aurora Core v2.0',         ok: false },
  { ms: 650,  text: 'L1–L2  Bio + Signal pipeline',          ok: true  },
  { ms: 950,  text: 'L3      Cognitive Core · 4 agents',     ok: true  },
  { ms: 1200, text: 'L4      Monte Carlo simulation engine',  ok: true  },
  { ms: 1420, text: 'L5–L6  Decision + TurnBot execution',   ok: true  },
  { ms: 1610, text: 'L7      Optimization loop',             ok: true  },
  { ms: 1780, text: 'AURORA intelligence core',              ok: true  },
  { ms: 1950, text: '▸  All systems nominal',               ok: false, done: true },
]

export function BootSplash({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<typeof BOOT[0][]>([])
  const [phase, setPhase] = useState<'boot' | 'logo' | 'dedicate'>('boot')

  useEffect(() => {
    BOOT.forEach(item => setTimeout(() => setLines(p => [...p, item]), item.ms))
    setTimeout(() => setPhase('logo'),     2300)
    setTimeout(() => setPhase('dedicate'), 3100)
    setTimeout(onDone,                     4400)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'var(--color-void)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="aurora-orb-1" />
      <div className="aurora-orb-2" />
      <div className="grid-overlay absolute inset-0 opacity-40" />

      <AnimatePresence mode="wait">

        {phase === 'boot' && (
          <motion.div key="boot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full max-w-xs px-6 z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg border border-[#00ffc840] bg-[#00ffc810] flex items-center justify-center">
                <span className="display font-black text-xs text-[#00ffc8]">AC</span>
              </div>
              <div className="display font-bold text-xs text-[#00ffc8] text-glow-teal tracking-[0.2em] uppercase">Aurora Core</div>
            </div>
            <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-glass)] backdrop-blur-xl space-y-2 min-h-[180px]">
              <AnimatePresence>
                {lines.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
                    className="flex items-center gap-2.5">
                    {l.done
                      ? <span className="text-[#00ffc8] mono text-[10px]">▸</span>
                      : l.ok
                        ? <span className="text-[#39ff14] mono text-[10px]">✓</span>
                        : <span className="text-[#00ffc8] mono text-[10px] blink">_</span>}
                    <span className={`mono text-[10px] leading-relaxed ${l.done ? 'text-[#00ffc8]' : l.ok ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)]'}`}>
                      {l.text}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {phase === 'logo' && (
          <motion.div key="logo" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}
            className="flex flex-col items-center gap-4 z-10">
            <div className="w-20 h-20 rounded-2xl border-2 border-[#00ffc840] bg-[#00ffc808] flex items-center justify-center glow-teal">
              <span className="display font-black text-3xl gradient-text-aurora">AC</span>
            </div>
            <div className="text-center">
              <div className="display font-black text-4xl gradient-text-aurora tracking-tight">AURORA CORE</div>
              <div className="mono text-[10px] text-[var(--color-muted)] tracking-[0.3em] mt-1 uppercase">Cognitive-Energy Ecosystem · v2.0</div>
            </div>
          </motion.div>
        )}

        {phase === 'dedicate' && (
          <motion.div key="ded" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-5 z-10 px-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, delay: 0.1 }}
              className="text-5xl">💙</motion.div>
            <div>
              <div className="display font-black text-2xl text-[var(--color-text)] mb-2">
                For <span className="gradient-text-legacy">Zachary Lee McLain</span>
              </div>
              <p className="mono text-[11px] text-[var(--color-muted)] leading-relaxed max-w-xs">
                Born April 13, 2026 · Galveston, Texas<br/>
                Every line of code. Every impossible problem.<br/>
                Every night that needed a reason.
              </p>
            </div>
            <div className="mono text-[9px] text-[var(--color-dim)] tracking-[0.25em] uppercase">
              Jonas Lee · Darrell Lee · Garrett Lee · Zachary Lee
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
