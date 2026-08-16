import { motion } from 'framer-motion'
import { Heart, Cpu, FileText, Users, Star, ArrowRight } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

const LINEAGE = [
  {
    name: 'Jonas B. McClung Sr.',
    year: 'Early 1900s',
    desc: 'The root of the line. A man who built something from nothing in Texas. His name carries forward in every generation that followed.',
    icon: '🌳',
  },
  {
    name: 'Darrell Lee McClung',
    year: 'Mid 1900s',
    desc: 'The second generation to carry the Lee middle name. A bridge between the old world and the new, whose choices shaped everything that came after.',
    icon: '🔗',
  },
  {
    name: 'Garrett Lee McLain',
    year: '1996 – Present',
    desc: "Solo inventor. Entrepreneur. Builder. Filed TurnBot's provisional patent. Built Aurora Core from scratch, on an iPhone, alone, for a son he loves more than anything on earth.",
    icon: '⚡',
    highlight: true,
  },
  {
    name: 'Zachary Lee McLain',
    year: 'April 13, 2026 –',
    desc: "Born at UTMB Health, Galveston, Texas. The reason Aurora Core exists. The reason TurnBot matters. The reason we don't stop. This entire platform — every line of code, every sleepless night, every impossible problem solved — is dedicated to him.",
    icon: '💙',
    highlight: true,
    isZachary: true,
  },
]

const MILESTONES = [
  {
    date: 'Mar 31, 2026',
    title: 'TurnBot Patent Filed',
    desc: 'USPTO Provisional #64/022,558. Filed pro se. A universal smart rotary actuator, designed to change the smart home industry.',
    color: 'var(--color-cyan)',
    icon: FileText,
  },
  {
    date: 'Apr 13, 2026',
    title: 'Zachary Lee McLain Born',
    desc: 'Everything changed. The mission became clear. Build a legacy worthy of his name.',
    color: 'oklch(0.85 0.20 0)',
    icon: Heart,
  },
  {
    date: 'Apr–May 2026',
    title: 'Aurora Core Rebuilt',
    desc: 'Torn down the Manus version. Rebuilt from the ground up. Clean code, zero dependencies, real AI. Deployed on Vercel. For Zachary.',
    color: 'var(--color-purple)',
    icon: Cpu,
  },
  {
    date: '2026 →',
    title: 'TurnBot Licensing',
    desc: "Targeting SwitchBot, MOES, Aqara, Tuya, Shelly, Wyze. $6.20 COGS. 71% gross margin. The product is ready. The world doesn't know it yet.",
    color: 'var(--color-green)',
    icon: Star,
  },
  {
    date: 'The Future',
    title: 'The McLain Legacy',
    desc: "Four generations of Lee. A family name carried forward with purpose. What Zachary inherits won't be debt — it will be proof that one person, with nothing but a phone and a vision, changed things.",
    color: 'var(--color-amber)',
    icon: Users,
  },
]

export function Legacy() {
  return (
    <PageTransition>
      <div className="min-h-full">

        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 aurora-gradient opacity-60" />
          <div className="absolute inset-0 grid-overlay" />
          <div className="relative px-4 md:px-8 py-12 md:py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="text-5xl mb-4">💙</div>
              <h1 className="font-display font-black text-3xl md:text-5xl text-[var(--color-text)] tracking-tight mb-3">
                For <span style={{ color: 'oklch(0.85 0.20 0)', textShadow: '0 0 30px oklch(0.70 0.20 0 / 0.6)' }}>Zachary</span>
              </h1>
              <p className="font-display text-sm md:text-base text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">
                Every line of code. Every sleepless night. Every impossible problem solved.<br />
                This is what a father builds when he has everything to prove and a son to prove it for.
              </p>
              <div className="mt-6 mono text-[10px] text-[var(--color-dim)] tracking-[0.25em] uppercase">
                Zachary Lee McLain · Born April 13, 2026 · Galveston, Texas
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-4 md:px-6 py-8 space-y-10 max-w-3xl mx-auto">

          {/* The Lee Lineage */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">The Lee Lineage</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-[10px] font-display text-[var(--color-dim)]">4 generations</span>
            </div>

            <div className="space-y-3">
              {LINEAGE.map((person, i) => (
                <motion.div
                  key={person.name}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                  <div className="flex gap-4">
                    {/* Connector */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border flex-shrink-0"
                        style={{
                          borderColor: person.isZachary ? 'oklch(0.70 0.20 0 / 0.6)' : person.highlight ? 'oklch(0.82 0.16 196 / 0.4)' : 'var(--color-border)',
                          backgroundColor: person.isZachary ? 'oklch(0.70 0.20 0 / 0.12)' : person.highlight ? 'oklch(0.82 0.16 196 / 0.08)' : 'var(--color-elevated)',
                          boxShadow: person.isZachary ? '0 0 16px oklch(0.70 0.20 0 / 0.3)' : undefined,
                        }}
                      >
                        {person.icon}
                      </div>
                      {i < LINEAGE.length - 1 && (
                        <div className="w-px flex-1 my-1 bg-[var(--color-border)] min-h-[16px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 card p-4 mb-3"
                      style={{
                        borderColor: person.isZachary ? 'oklch(0.70 0.20 0 / 0.5)' : person.highlight ? 'oklch(0.82 0.16 196 / 0.3)' : undefined,
                        backgroundColor: person.isZachary ? 'oklch(0.70 0.20 0 / 0.06)' : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-display font-bold text-sm text-[var(--color-text)]">{person.name}</div>
                        <span className="mono text-[9px] text-[var(--color-dim)] flex-shrink-0 mt-0.5">{person.year}</span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">{person.desc}</p>
                      {person.name.includes('Lee') && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-display border"
                          style={{ borderColor: 'oklch(0.82 0.16 196 / 0.3)', color: 'var(--color-cyan)', backgroundColor: 'oklch(0.82 0.16 196 / 0.06)' }}>
                          ✦ Lee · Carried forward
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Mission Statement */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card aurora-gradient p-6 text-center"
          >
            <div className="text-2xl mb-3">🏴‍☠️</div>
            <h2 className="font-display font-black text-lg text-[var(--color-text)] mb-3">The Mission</h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-lg mx-auto">
              Built entirely on an iPhone 16 Pro Max. No laptop. No team. No outside funding.
              Just a father in Jamaica Beach, Texas, who refused to let circumstance define his son's inheritance.
            </p>
            <div className="mt-4 flex justify-center gap-3 flex-wrap">
              {['TurnBot USPTO #64/022,558', 'Aurora Core v2.0', 'Sand & Done', 'YouBeenClassed'].map(t => (
                <span key={t} className="text-[10px] font-display px-2.5 py-1 rounded-full border border-[var(--color-borderhi)] text-[var(--color-muted)]">{t}</span>
              ))}
            </div>
          </motion.section>

          {/* Timeline */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">The Journey</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            <div className="space-y-3">
              {MILESTONES.map((m, i) => {
                const Icon = m.icon
                return (
                  <motion.div
                    key={m.title}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0"
                        style={{ borderColor: m.color + '50', backgroundColor: m.color + '12' }}>
                        <Icon className="w-4 h-4" style={{ color: m.color }} />
                      </div>
                      {i < MILESTONES.length - 1 && <div className="w-px flex-1 my-1 bg-[var(--color-border)] min-h-[12px]" />}
                    </div>
                    <div className="flex-1 card p-3.5 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono text-[9px]" style={{ color: m.color }}>{m.date}</span>
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>
                      <div className="font-display font-bold text-sm text-[var(--color-text)] mb-1">{m.title}</div>
                      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">{m.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* TurnBot snapshot */}
          <section className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">TurnBot · The Product</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Patent',    v: '#64/022,558', color: 'var(--color-cyan)'   },
                { l: 'COGS',      v: '$6.20',        color: 'var(--color-green)'  },
                { l: 'Margin',    v: '71%',          color: 'var(--color-amber)'  },
                { l: 'Filed',     v: 'Mar 31 \'26',  color: 'var(--color-purple)' },
              ].map(item => (
                <div key={item.l} className="bg-[var(--color-elevated)] rounded-lg p-3 text-center">
                  <div className="text-[9px] font-display uppercase text-[var(--color-muted)] mb-1">{item.l}</div>
                  <div className="mono text-sm font-bold" style={{ color: item.color }}>{item.v}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--color-muted)] mt-4 leading-relaxed">
              A universal smart rotary actuator that turns any manual valve, knob, or dial into a smart device.
              Targets SwitchBot, MOES, Aqara, Tuya, Shelly, and Wyze for licensing.
              TurnBot Pro (25 Nm, Matter 1.5) is the flagship — and it's built into Aurora Core's L6 execution layer.
            </p>
            <div className="flex items-center gap-2 mt-3 text-[10px] font-display text-[var(--color-cyan)]">
              <ArrowRight className="w-3 h-3" />
              <span>Outreach active · MOES responded positively · SONOFF OEM contact established</span>
            </div>
          </section>

          {/* Final dedication */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-center py-8"
          >
            <div className="text-4xl mb-4">💙</div>
            <blockquote className="font-display text-base md:text-lg text-[var(--color-text)] leading-relaxed max-w-lg mx-auto italic">
              "I don't have much right now. But I have you, Zachary. And I have a plan. And I have today. That's enough to start."
            </blockquote>
            <div className="mt-4 font-display text-xs text-[var(--color-muted)]">— Garrett Lee McLain, Jamaica Beach, Texas, 2026</div>
            <div className="mt-6 mono text-[10px] text-[var(--color-dim)] tracking-[0.2em] uppercase">
              Jonas Lee → Darrell Lee → Garrett Lee → Zachary Lee
            </div>
            <div className="mt-2 font-display text-[10px] text-[var(--color-dim)] tracking-[0.15em] uppercase">
              The line continues. The name carries forward. Always.
            </div>
          </motion.section>

        </div>
      </div>
    </PageTransition>
  )
}
