import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ExternalLink, Zap, RefreshCw, Brain, BarChart3, Plus } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { SectionLabel } from '../components/Layout'

type Integration = {
  id: string; name: string; category: string; description: string
  status: 'connected' | 'available' | 'coming_soon'
  color: string; emoji: string
  features: string[]
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack', name: 'Slack', category: 'Communication',
    description: 'Receive Aurora Core alerts, system notifications, and AURORA AI insights directly in your Slack channels.',
    status: 'available', color: '#4A154B', emoji: '💬',
    features: ['System alerts', 'Agent conflict notifications', 'Daily energy summary', 'Custom webhooks'],
  },
  {
    id: 'gmail', name: 'Gmail', category: 'Communication',
    description: 'Aurora Core dispatches critical system reports and weekly optimization summaries to your inbox.',
    status: 'available', color: '#EA4335', emoji: '📧',
    features: ['Weekly reports', 'Critical alerts', 'Battery health digest', 'Energy savings summary'],
  },
  {
    id: 'notion', name: 'Notion', category: 'Productivity',
    description: 'Log system events, insights, and AURORA decisions automatically to a Notion workspace.',
    status: 'available', color: '#000000', emoji: '📋',
    features: ['Decision log', 'Insight database', 'Energy journal', 'System audit trail'],
  },
  {
    id: 'github', name: 'GitHub', category: 'Developer',
    description: 'Trigger Aurora Core automations from GitHub Actions. Deploy firmware updates to TurnBot via CI/CD.',
    status: 'connected', color: '#24292e', emoji: '🐙',
    features: ['CI/CD firmware OTA', 'Webhook triggers', 'Automated deploys', 'Repo sync'],
  },
  {
    id: 'sheets', name: 'Google Sheets', category: 'Data',
    description: 'Stream live energy, biometric, and system metrics directly into Google Sheets for custom analysis.',
    status: 'available', color: '#0F9D58', emoji: '📊',
    features: ['Live metric streaming', 'Historical export', 'Custom dashboards', 'Cost analysis'],
  },
  {
    id: 'discord', name: 'Discord', category: 'Communication',
    description: 'Mirror Aurora Core system events and AURORA AI responses into a private Discord server.',
    status: 'available', color: '#5865F2', emoji: '🎮',
    features: ['System event mirror', 'AI response relay', 'Alert channels', 'Status bot'],
  },
  {
    id: 'drive', name: 'Google Drive', category: 'Storage',
    description: 'Automatically backup system logs, simulation results, and optimization reports to Google Drive.',
    status: 'coming_soon', color: '#4285F4', emoji: '☁️',
    features: ['Auto-backup logs', 'Simulation exports', 'Report archive', 'Document sync'],
  },
  {
    id: 'zapier', name: 'Zapier', category: 'Automation',
    description: 'Connect Aurora Core to 5,000+ apps through Zapier. Trigger anything from any system event.',
    status: 'coming_soon', color: '#FF4A00', emoji: '⚡',
    features: ['5000+ app triggers', 'Custom workflows', 'Event webhooks', 'Multi-step zaps'],
  },
  {
    id: 'homekit', name: 'Apple HomeKit', category: 'Smart Home',
    description: 'Expose TurnBot devices to HomeKit. Control actuators via Siri, Shortcuts, and the Home app.',
    status: 'coming_soon', color: '#555555', emoji: '🏠',
    features: ['TurnBot in HomeKit', 'Siri commands', 'Shortcuts integration', 'Automations'],
  },
  {
    id: 'matter', name: 'Matter / Thread', category: 'Smart Home',
    description: 'Native Matter 1.5 and Thread protocol support via TurnBot Hub. Works with any Matter controller.',
    status: 'connected', color: '#00A86B', emoji: '🔗',
    features: ['Matter 1.5 native', 'Thread mesh', 'Universal controller compat', 'OTA updates'],
  },
  {
    id: 'openai', name: 'OpenAI', category: 'AI',
    description: 'Optional secondary inference layer. Route specific agent tasks to GPT-4o as a fallback or comparison.',
    status: 'coming_soon', color: '#10A37F', emoji: '🤖',
    features: ['GPT-4o fallback', 'Agent A/B eval', 'Response comparison', 'Cost routing'],
  },
  {
    id: 'anthropic', name: 'Claude / Anthropic', category: 'AI',
    description: 'Primary intelligence layer. AURORA runs on Claude Sonnet with tool use, system context, and action execution.',
    status: 'connected', color: '#CC785C', emoji: '✦',
    features: ['Tool use active', 'System actions', 'Streaming inference', 'Agent consensus'],
  },
]

const CATEGORIES = ['All', 'Communication', 'Smart Home', 'AI', 'Data', 'Developer', 'Productivity', 'Automation', 'Storage']

const STATUS_CONFIG = {
  connected:    { label: 'Connected',    color: 'var(--color-green)',  bg: 'oklch(0.74 0.17 145 / 0.12)', border: 'oklch(0.74 0.17 145 / 0.35)' },
  available:    { label: 'Available',    color: 'var(--color-cyan)',   bg: 'oklch(0.82 0.16 196 / 0.08)', border: 'oklch(0.82 0.16 196 / 0.25)' },
  coming_soon:  { label: 'Coming Soon',  color: 'var(--color-muted)',  bg: 'oklch(0.20 0.040 240 / 0.5)', border: 'var(--color-border)'         },
}

const LAYERS = [
  { label: 'APPS & TOOLS',      sub: 'The tools you use',           items: ['Slack', 'Gmail', 'Notion', 'GitHub', 'Sheets', '+'],      color: 'var(--color-green)'  },
  { label: 'API LAYER',         sub: 'Connectors & Protocols',      items: ['REST', 'GraphQL', 'Webhooks', 'OAuth'],                    color: 'var(--color-cyan)'   },
  { label: 'AURORA CORE',       sub: 'Agentic Automation Core',     items: ['AURORA CORE'],                                             color: 'var(--color-green)', hero: true },
  { label: 'AUTOMATION LAYER',  sub: 'Workflows that run the world', items: ['Workflows', 'AI Agents', 'Data', 'Insights'],             color: 'var(--color-purple)' },
]

export function Integrations() {
  const [filter, setFilter]   = useState('All')
  const [selected, setSelected] = useState<Integration | null>(null)

  const visible = INTEGRATIONS.filter(i => filter === 'All' || i.category === filter)
  const connectedCount = INTEGRATIONS.filter(i => i.status === 'connected').length

  return (
    <PageTransition>
      <div className="min-h-full">

        {/* Hero */}
        <div className="relative overflow-hidden px-4 md:px-8 py-10 md:py-14 border-b border-[var(--color-border)]">
          <div className="aurora-orb-1" style={{ opacity: 0.25, filter: 'blur(120px)' }} />
          <div className="aurora-orb-2" style={{ opacity: 0.18, filter: 'blur(140px)' }} />
          <div className="grid-overlay absolute inset-0" />
          <div className="relative z-10 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 border border-[var(--color-borderhi)] rounded-full px-3 py-1 mb-4 text-[9px] font-display tracking-widest text-[var(--color-muted)] uppercase bg-[var(--color-surface)]/60 backdrop-blur-sm">
              <span className="status-dot pulse-dot" style={{ backgroundColor: 'var(--color-green)', width: 5, height: 5 }} />
              {connectedCount} integrations active
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="font-display font-black text-3xl md:text-5xl text-[var(--color-text)] leading-tight mb-3">
              Own Your<br />
              <span className="gradient-text-aurora">Integrations.</span><br />
              Not the Chaos.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-sm text-[var(--color-muted)] max-w-lg leading-relaxed font-display">
              Aurora Core is the agentic automation infrastructure that connects your tools,
              adapts in real-time, and gets work done — without you lifting a finger.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="flex flex-wrap gap-4 mt-5">
              {[
                { icon: Brain,      label: 'Agentic Intelligence'  },
                { icon: RefreshCw,  label: 'Self-Healing Integrations' },
                { icon: Zap,        label: 'Real-Time Adaptability' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[10px] font-display text-[var(--color-muted)]">
                  <Icon className="w-3.5 h-3.5 text-[var(--color-cyan)]" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="px-4 md:px-6 py-6 space-y-8 max-w-5xl mx-auto">

          {/* Architecture stack */}
          <div>
            <SectionLabel>System Architecture</SectionLabel>
            <div className="space-y-1.5">
              {LAYERS.map((layer, i) => (
                <motion.div
                  key={layer.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`card p-3.5 flex items-center gap-4 ${layer.hero ? 'card-active' : ''}`}
                  style={layer.hero ? { borderColor: 'var(--color-green)', background: 'oklch(0.74 0.17 145 / 0.06)' } : undefined}
                >
                  <div className="w-28 flex-shrink-0">
                    <div className="text-[9px] font-display font-bold tracking-widest uppercase" style={{ color: layer.color }}>{layer.label}</div>
                    <div className="text-[8px] text-[var(--color-dim)] font-display">{layer.sub}</div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {layer.items.map(item => (
                      <div key={item}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-display font-semibold border ${layer.hero ? 'text-[var(--color-green)] border-[oklch(0.74_0.17_145_/_0.4)] bg-[oklch(0.74_0.17_145_/_0.08)]' : 'text-[var(--color-muted)] border-[var(--color-border)] bg-[var(--color-elevated)]'}`}>
                        {item === '+' ? <Plus className="w-2.5 h-2.5" /> : item}
                      </div>
                    ))}
                  </div>
                  {i < LAYERS.length - 1 && (
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[var(--color-dim)]">↓</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-semibold border transition-all ${
                    filter === cat
                      ? 'bg-[oklch(0.82_0.16_196_/_0.12)] text-[var(--color-cyan)] border-[oklch(0.82_0.16_196_/_0.3)]'
                      : 'text-[var(--color-muted)] border-transparent hover:border-[var(--color-border)]'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Integration grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {visible.map((intg, i) => {
                  const sc = STATUS_CONFIG[intg.status]
                  return (
                    <motion.div
                      key={intg.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelected(intg)}
                      className={`card card-glow p-4 cursor-pointer flex flex-col gap-3 ${intg.status === 'coming_soon' ? 'opacity-60' : ''}`}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
                            style={{ borderColor: intg.color + '40', backgroundColor: intg.color + '15' }}>
                            {intg.emoji}
                          </div>
                          <div>
                            <div className="font-display font-bold text-sm text-[var(--color-text)]">{intg.name}</div>
                            <div className="text-[9px] font-display text-[var(--color-dim)] uppercase tracking-wider">{intg.category}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-display font-bold border"
                          style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}>
                          {intg.status === 'connected' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {sc.label}
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed line-clamp-2">{intg.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {intg.features.slice(0, 3).map(f => (
                          <span key={f} className="text-[8px] font-display px-1.5 py-0.5 rounded bg-[var(--color-elevated)] text-[var(--color-dim)] border border-[var(--color-border)]">{f}</span>
                        ))}
                        {intg.features.length > 3 && (
                          <span className="text-[8px] font-display px-1.5 py-0.5 rounded bg-[var(--color-elevated)] text-[var(--color-dim)]">+{intg.features.length - 3}</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats footer */}
          <div className="card aurora-gradient p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { v: `${INTEGRATIONS.filter(i => i.status === 'connected').length}`,   l: 'Active',      c: 'var(--color-green)'  },
                { v: `${INTEGRATIONS.filter(i => i.status === 'available').length}`,   l: 'Available',   c: 'var(--color-cyan)'   },
                { v: `${INTEGRATIONS.filter(i => i.status === 'coming_soon').length}`, l: 'Coming Soon', c: 'var(--color-muted)'  },
                { v: '∞',                                                              l: 'Via Webhooks', c: 'var(--color-purple)' },
              ].map(s => (
                <div key={s.l}>
                  <div className="mono text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[9px] font-display uppercase text-[var(--color-muted)] tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Detail drawer */}
        <AnimatePresence>
          {selected && (
            <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute bottom-0 inset-x-0 md:inset-x-auto md:right-0 md:top-0 md:w-96 bg-[var(--color-surface)] border-t md:border-t-0 md:border-l border-[var(--color-border)] flex flex-col rounded-t-2xl md:rounded-none"
              >
                <div className="p-5 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
                      style={{ borderColor: selected.color + '50', backgroundColor: selected.color + '15' }}>
                      {selected.emoji}
                    </div>
                    <div>
                      <div className="font-display font-bold text-base text-[var(--color-text)]">{selected.name}</div>
                      <div className="text-[9px] font-display text-[var(--color-dim)] uppercase tracking-wider">{selected.category}</div>
                    </div>
                    <button onClick={() => setSelected(null)} className="ml-auto text-[var(--color-muted)] hover:text-[var(--color-text)] p-1">✕</button>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{selected.description}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <div className="text-[9px] font-display font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">Features</div>
                    <div className="space-y-1.5">
                      {selected.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                          <CheckCircle2 className="w-3 h-3 text-[var(--color-green)] flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-[var(--color-border)]">
                  {selected.status === 'connected' ? (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[oklch(0.74_0.17_145_/_0.4)] bg-[oklch(0.74_0.17_145_/_0.08)] text-sm font-display font-semibold text-[var(--color-green)]">
                      <CheckCircle2 className="w-4 h-4" /> Active & Connected
                    </div>
                  ) : selected.status === 'available' ? (
                    <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[oklch(0.82_0.16_196_/_0.4)] bg-[oklch(0.82_0.16_196_/_0.10)] text-sm font-display font-semibold text-[var(--color-cyan)] hover:bg-[oklch(0.82_0.16_196_/_0.18)] transition-all">
                      <ExternalLink className="w-4 h-4" /> Connect {selected.name}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-border)] text-sm font-display font-semibold text-[var(--color-muted)]">
                      Coming Soon
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  )
}
