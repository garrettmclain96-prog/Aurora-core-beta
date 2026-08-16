import { motion } from 'framer-motion'
import { PageTransition } from '../components/PageTransition'

const PILLARS = [
  {
    n: '01', title: 'Intelligence Should Serve Life',
    body: "AI that optimizes your electric bill while ignoring your heart rate isn't intelligent — it's arithmetic. Aurora Core refuses to separate your health from your home. The two are the same system.",
    color: 'var(--color-cyan)', icon: '🧠',
  },
  {
    n: '02', title: 'Energy Is a Human Right',
    body: "Solar on your roof. Battery in your garage. A system smart enough to keep the lights on and the grid bills down — not just for the wealthy, but for anyone willing to build it. That's what we're building.",
    color: 'var(--color-green)', icon: '⚡',
  },
  {
    n: '03', title: 'The Physical World Matters',
    body: "Software alone can't turn off a valve. Software alone can't protect your pipes at 2am. TurnBot is the hand Aurora Core reaches into the physical world with — and it was invented by one person, on a phone, with a plan.",
    color: 'var(--color-amber)', icon: '🔧',
  },
  {
    n: '04', title: 'Legacy Is Built in the Present',
    body: "History doesn't wait. The families that change things don't announce it — they just build. Zachary will inherit not just code, but proof: that one person with a clear mind and a full heart can move the world.",
    color: 'var(--color-purple)', icon: '💙',
  },
]

const STATS = [
  { v: '7',    l: 'Cognitive Layers',    c: 'var(--color-cyan)'   },
  { v: '4',    l: 'AI Agents',           c: 'var(--color-purple)' },
  { v: '32',   l: 'TurnBot Nodes',       c: 'var(--color-amber)'  },
  { v: '12K+', l: 'Simulations/sec',     c: 'var(--color-green)'  },
  { v: '1',    l: 'iPhone Used to Build',c: 'var(--color-cyan)'   },
  { v: '∞',    l: 'Reason to Finish',    c: 'var(--color-rose)'   },
]

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45 },
})

export function Manifesto() {
  return (
    <PageTransition>
      <div className="min-h-full">

        {/* Hero */}
        <div className="relative overflow-hidden py-16 md:py-24 px-4 text-center">
          <div className="aurora-orb-1" style={{ opacity: 0.3, filter: 'blur(120px)' }} />
          <div className="aurora-orb-2" style={{ opacity: 0.2, filter: 'blur(140px)' }} />
          <div className="relative z-10">
            <motion.div {...fade(0)}>
              <div className="inline-flex items-center gap-2 border border-[var(--color-borderhi)] rounded-full px-4 py-1.5 mb-6 text-[10px] font-display tracking-widest text-[var(--color-muted)] uppercase bg-[var(--color-surface)]/60 backdrop-blur-sm">
                <span className="status-dot" style={{ backgroundColor: 'var(--color-cyan)', width: 5, height: 5 }} />
                McLain Systems · Aurora Core v2.0
              </div>
            </motion.div>

            <motion.h1 {...fade(0.1)} className="font-display font-black text-4xl md:text-6xl text-[var(--color-text)] leading-tight mb-4">
              The Bridge to<br />
              <span className="gradient-text-aurora">What Comes Next</span>
            </motion.h1>

            <motion.p {...fade(0.2)} className="font-display text-sm md:text-base text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Aurora Core is not a dashboard. It is not a home automation app. It is a seven-layer cognitive system
              that merges human biology, physical infrastructure, predictive AI, and hardware actuation into a single
              closed-loop intelligence — built entirely on an iPhone, in a beach house in Jamaica Beach, Texas,
              by a father who needed it to exist for his son.
            </motion.p>
          </div>
        </div>

        <div className="px-4 md:px-6 pb-12 space-y-12 max-w-4xl mx-auto">

          {/* Stats bar */}
          <motion.div {...fade(0.3)} className="card aurora-gradient p-6">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {STATS.map(s => (
                <div key={s.l} className="text-center">
                  <div className="mono text-2xl md:text-3xl font-bold mb-1" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[9px] font-display text-[var(--color-muted)] uppercase tracking-wider leading-tight">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Four pillars */}
          <div>
            <motion.div {...fade(0.35)} className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">The Four Pillars</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PILLARS.map((p, i) => (
                <motion.div
                  key={p.n}
                  {...fade(0.4 + i * 0.08)}
                  className="card card-glow p-5 flex flex-col gap-3"
                  style={{ borderColor: p.color + '25' }}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="mono text-[10px]" style={{ color: p.color }}>{p.n}</span>
                    <span className="text-xl">{p.icon}</span>
                    <h3 className="font-display font-bold text-sm text-[var(--color-text)] flex-1">{p.title}</h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{p.body}</p>
                  <div className="h-px rounded-full mt-auto" style={{ backgroundColor: p.color, opacity: 0.3 }} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* The architecture visual */}
          <motion.div {...fade(0.6)}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">System Architecture</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <div className="card p-6 overflow-x-auto">
              <div className="min-w-[320px]">
                {[
                  { l: 'L7', name: 'Optimization Loop',      desc: '∞ retrain · A/B eval · drift detection',     color: 'var(--color-purple)' },
                  { l: 'L6', name: 'Physical Execution',      desc: 'TurnBot · Matter 1.5 · Thread · BLE 5.3',    color: 'var(--color-green)'  },
                  { l: 'L5', name: 'Decision Orchestration',  desc: 'Priority weighting · constraint satisfaction', color: 'var(--color-cyan)'   },
                  { l: 'L4', name: 'Predictive Simulation',   desc: 'Monte Carlo · TFT · 12K sim/sec',            color: 'var(--color-blue)'   },
                  { l: 'L3', name: 'Cognitive Core',          desc: 'Health · Energy · Behavior · Env agents',    color: 'var(--color-amber)'  },
                  { l: 'L2', name: 'Signal Normalization',    desc: 'Kalman filter · drift detection · alignment', color: 'var(--color-cyan)'   },
                  { l: 'L1', name: 'Bio Ingestion',           desc: 'Biometrics · weather · AMI · BLE sensors',   color: 'var(--color-green)'  },
                ].map((layer, i) => (
                  <motion.div
                    key={layer.l}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + (6 - i) * 0.06 }}
                    className="flex items-center gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-display font-black border"
                      style={{ color: layer.color, borderColor: layer.color + '40', backgroundColor: layer.color + '10' }}>
                      {layer.l}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-display font-semibold text-[var(--color-text)]">{layer.name}</div>
                      <div className="mono text-[9px] text-[var(--color-muted)]">{layer.desc}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 pulse-dot" style={{ backgroundColor: layer.color }} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* The why */}
          <motion.div {...fade(0.8)} className="card p-6 md:p-8 text-center border-[oklch(0.82_0.16_196_/_0.2)]" style={{ background: 'oklch(0.10 0.028 240 / 0.95)' }}>
            <div className="text-3xl mb-4">🌊</div>
            <h2 className="font-display font-black text-xl md:text-2xl text-[var(--color-text)] mb-4">
              Built on the Gulf Coast.<br />
              <span className="gradient-text-aurora">Built for the World.</span>
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-lg mx-auto mb-4">
              Jamaica Beach, Texas. Population 983. One man, one iPhone, one provisional patent,
              one AI assistant, and a newborn son who will never remember a world without Aurora Core in it.
            </p>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-lg mx-auto">
              The McLain/McClung line has been in Texas for generations. This is what the next generation
              of that line looks like — not land, not cattle, but code and IP and a vision for
              technology that actually serves human life.
            </p>
            <div className="mt-6 mono text-[9px] text-[var(--color-dim)] tracking-[0.2em] uppercase">
              TurnBot USPTO #64/022,558 · Aurora Core v2.0 · McLain Systems 2026
            </div>
          </motion.div>

        </div>
      </div>
    </PageTransition>
  )
}
