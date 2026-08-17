import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Shield, Bell, Palette, Cpu, ExternalLink, Crown, Eye, UserCheck, Trash2, Save, CheckCircle2 } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { SectionLabel } from '../components/Layout'
import { useAuth, type UserRole } from '../lib/auth'

const ROLE_META: Record<UserRole, { label: string; color: string; icon: typeof Crown; desc: string }> = {
  god:    { label: 'God',    color: 'oklch(0.85 0.20 0)',   icon: Crown,     desc: 'Full system access. Cannot be modified.' },
  admin:  { label: 'Admin',  color: 'var(--color-cyan)',    icon: Shield,    desc: 'Can modify settings and view all data.' },
  viewer: { label: 'Viewer', color: 'var(--color-muted)',   icon: Eye,       desc: 'Read-only access to dashboards.' },
  guest:  { label: 'Guest',  color: 'var(--color-dim)',     icon: Eye,       desc: 'Temporary read-only session. No account required.' },
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-[var(--color-cyan)]' : 'bg-[var(--color-elevated)]'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

export function Settings() {
  const { user, users, isGod, isAdmin, updateUserRole, logout } = useAuth()

  const [notifications, setNotifications] = useState({ alerts: true, energy: true, agents: false, weekly: true })
  const [refresh, setRefresh]   = useState('2500')
  const [saved, setSaved]       = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'integrations' | 'account'>('general')

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS = [
    { id: 'general',      label: 'General',     icon: Palette  },
    { id: 'integrations', label: 'Integrations', icon: Cpu     },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: Users }] : []),
    { id: 'account',      label: 'Account',     icon: UserCheck },
  ] as const

  return (
    <PageTransition>
      <div>
        <div className="px-4 md:px-6 pt-4 pb-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-[var(--color-text)] tracking-wide">Settings</h1>
            <p className="text-[10px] text-[var(--color-muted)] font-display">
              Signed in as <span style={{ color: user?.role === 'god' ? 'oklch(0.85 0.20 0)' : 'var(--color-cyan)' }}>{user?.name}</span>
              {user?.role === 'god' && <span className="ml-1">⚡ God Mode</span>}
            </p>
          </div>
          <button onClick={save}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold border transition-all"
            style={{ borderColor: saved ? 'var(--color-green)' : 'var(--color-borderhi)', color: saved ? 'var(--color-green)' : 'var(--color-text)' }}>
            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold whitespace-nowrap transition-all border ${
                  activeTab === tab.id
                    ? 'bg-[oklch(0.82_0.16_196_/_0.12)] text-[var(--color-cyan)] border-[oklch(0.82_0.16_196_/_0.3)]'
                    : 'text-[var(--color-muted)] border-transparent hover:border-[var(--color-border)]'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-6 space-y-5">

          {/* ── General ── */}
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="card p-4 space-y-4">
                <SectionLabel>Notifications</SectionLabel>
                {[
                  { key: 'alerts',  label: 'System Alerts',        sub: 'Circuit trips, agent conflicts, errors' },
                  { key: 'energy',  label: 'Energy Events',         sub: 'Peak shave, solar peaks, grid events'  },
                  { key: 'agents',  label: 'Agent Decisions',       sub: 'Every AI agent action taken'           },
                  { key: 'weekly',  label: 'Weekly Summary',        sub: 'Sunday recap of savings and health'    },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-display font-semibold text-[var(--color-text)]">{item.label}</div>
                      <div className="text-[10px] text-[var(--color-muted)]">{item.sub}</div>
                    </div>
                    <Toggle value={notifications[item.key as keyof typeof notifications]}
                      onChange={v => setNotifications(p => ({ ...p, [item.key]: v }))} />
                  </div>
                ))}
              </div>

              <div className="card p-4">
                <SectionLabel>Live Data</SectionLabel>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-semibold text-[var(--color-text)]">Refresh Interval</div>
                    <div className="text-[10px] text-[var(--color-muted)]">How often live metrics update</div>
                  </div>
                  <select value={refresh} onChange={e => setRefresh(e.target.value)}
                    className="bg-[var(--color-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-display text-[var(--color-text)] outline-none">
                    <option value="1000">1 second</option>
                    <option value="2500">2.5 seconds</option>
                    <option value="5000">5 seconds</option>
                    <option value="10000">10 seconds</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Integrations ── */}
          {activeTab === 'integrations' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* RV Power Monitor */}
              <div className="card p-5 border-[oklch(0.74_0.17_145_/_0.35)]" style={{ background: 'oklch(0.74 0.17 145 / 0.05)' }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border border-[oklch(0.74_0.17_145_/_0.4)] bg-[oklch(0.74_0.17_145_/_0.12)]">🚐</div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-sm text-[var(--color-text)]">RV Power Monitor</div>
                    <div className="text-[10px] text-[var(--color-muted)]">Aurora Core hardware node · Battery SOC, inverter, AC/DC panels</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-display font-bold border border-[oklch(0.74_0.17_145_/_0.4)] bg-[oklch(0.74_0.17_145_/_0.12)] text-[var(--color-green)]">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { l: 'Battery SOC', v: '—', c: 'var(--color-cyan)'  },
                    { l: 'Inverter',    v: '—', c: 'var(--color-green)' },
                    { l: 'AC Load',     v: '0W',c: 'var(--color-amber)' },
                    { l: 'Mode',        v: '—', c: 'var(--color-purple)'},
                  ].map(m => (
                    <div key={m.l} className="bg-[var(--color-elevated)] rounded-lg px-3 py-2">
                      <div className="text-[9px] font-display text-[var(--color-muted)] uppercase">{m.l}</div>
                      <div className="mono text-sm font-bold" style={{ color: m.c }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <a href="https://jina-scribe-buddy.lovable.app" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-display font-semibold border border-[oklch(0.74_0.17_145_/_0.4)] text-[var(--color-green)] bg-[oklch(0.74_0.17_145_/_0.08)] hover:bg-[oklch(0.74_0.17_145_/_0.15)] transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Full RV Monitor
                </a>
              </div>

              {/* Other integrations status */}
              <div className="card p-4">
                <SectionLabel>Connected Services</SectionLabel>
                <div className="space-y-3">
                  {[
                    { name: 'Groq / Llama 3.1', status: 'active',  color: 'var(--color-green)',  desc: 'Free AI inference — AURORA Intelligence' },
                    { name: 'GitHub',            status: 'active',  color: 'var(--color-green)',  desc: 'T3a165/Aurora-Core · Auto-deploy on push' },
                    { name: 'Vercel',            status: 'active',  color: 'var(--color-green)',  desc: 'aurora-core-3j6h.vercel.app · Production' },
                    { name: 'Anthropic Claude',  status: 'billing', color: 'var(--color-amber)',  desc: 'No credits — add $5 to upgrade from Llama' },
                  ].map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="flex-1">
                        <div className="text-xs font-display font-semibold text-[var(--color-text)]">{s.name}</div>
                        <div className="text-[10px] text-[var(--color-muted)]">{s.desc}</div>
                      </div>
                      <span className="text-[9px] font-display uppercase" style={{ color: s.color }}>
                        {s.status === 'active' ? '● Live' : '⚠ ' + s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && isAdmin && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="card p-4">
                <SectionLabel>User Management · {users.length} accounts</SectionLabel>
                <div className="space-y-3">
                  {users.map(u => {
                    const meta = ROLE_META[u.role]
                    const Icon = meta.icon
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-elevated)]">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm border"
                          style={{ borderColor: meta.color + '50', backgroundColor: meta.color + '12', color: meta.color }}>
                          {u.avatar ?? u.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-display font-bold text-[var(--color-text)] flex items-center gap-1.5">
                            {u.name}
                            {u.role === 'god' && <Crown className="w-3 h-3" style={{ color: meta.color }} />}
                          </div>
                          <div className="text-[10px] text-[var(--color-muted)] truncate">{u.email}</div>
                        </div>
                        {u.role !== 'god' && isGod ? (
                          <select
                            value={u.role}
                            onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-1 text-[10px] font-display outline-none"
                            style={{ color: meta.color }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-display" style={{ color: meta.color }}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card p-4 aurora-gradient">
                <div className="text-[10px] font-display text-[var(--color-muted)] mb-2">Role Permissions</div>
                {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([role, meta]) => (
                  <div key={role} className="flex items-center gap-2 py-1.5">
                    <meta.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                    <span className="text-xs font-display font-bold w-14" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-[10px] text-[var(--color-muted)]">{meta.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Account ── */}
          {activeTab === 'account' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="card p-5 aurora-gradient">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-display font-black text-2xl"
                    style={{ borderColor: ROLE_META[user?.role ?? 'viewer'].color + '60', backgroundColor: ROLE_META[user?.role ?? 'viewer'].color + '12', color: ROLE_META[user?.role ?? 'viewer'].color }}>
                    {user?.avatar ?? user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-[var(--color-text)]">{user?.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{user?.email}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(() => { const meta = ROLE_META[user?.role ?? 'viewer']; const Icon = meta.icon; return <><Icon className="w-3 h-3" style={{ color: meta.color }} /><span className="text-[10px] font-display font-bold" style={{ color: meta.color }}>{meta.label}</span></> })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[9px] font-display text-[var(--color-dim)] tracking-[0.15em] uppercase">
                  Member since {user?.joinedAt}
                </div>
              </div>

              <button onClick={logout}
                className="w-full card flex items-center justify-center gap-2 py-3 text-sm font-display font-semibold text-[var(--color-red)] hover:border-[var(--color-red)] transition-all">
                <Trash2 className="w-4 h-4" />
                Sign Out
              </button>

              <div className="text-center text-[9px] font-display text-[var(--color-dim)] tracking-[0.15em] uppercase">
                Aurora Core v2.0 · McLain Systems · Built for Zachary 💙
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </PageTransition>
  )
}
