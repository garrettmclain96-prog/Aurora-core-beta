import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  Wrench, HardDrive, Heart, Settings, ChevronLeft, ChevronRight, Crown, Activity,
} from 'lucide-react'
import clsx from 'clsx'
import { AuroraBackground } from './AuroraBackground'
import { useAuth } from '../lib/auth'

const NAV = [
  { path: '/',         icon: Wrench,    label: 'Cases'    },
  { path: '/gear',     icon: HardDrive, label: 'Gear'     },
  { path: '/legacy',   icon: Heart,     label: 'Legacy'   },
  { path: '/settings', icon: Settings,  label: 'Settings' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const { user, isGod } = useAuth()

  const isActive = (path: string) =>
    path === '/' ? (location === '/' || location.startsWith('/case')) : location.startsWith(path)

  const navClass = (active: boolean) => clsx(
    'flex items-center gap-3 px-2.5 py-2 rounded-lg font-medium transition-all cursor-pointer',
    active
      ? 'bg-[oklch(0.82_0.16_196_/_0.12)] text-[var(--color-cyan)] border border-[oklch(0.82_0.16_196_/_0.35)]'
      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]',
  )

  const UserBadge = () => (
    <Link href="/settings" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-elevated)] transition-colors cursor-pointer">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display font-black border ${
        isGod ? 'border-[oklch(0.85_0.20_0_/_0.5)] bg-[oklch(0.85_0.20_0_/_0.12)] text-[oklch(0.90_0.18_0)]'
              : 'border-[var(--color-borderhi)] bg-[var(--color-elevated)] text-[var(--color-cyan)]'
      }`}>
        {isGod ? '⚡' : user?.name?.[0]?.toUpperCase()}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="text-[10px] font-display font-bold truncate" style={{ color: isGod ? 'oklch(0.90 0.18 0)' : 'var(--color-text)' }}>
            {isGod ? 'God Mode' : user?.name}
          </div>
          <div className="text-[8px] text-[var(--color-dim)] truncate">{user?.role}</div>
        </div>
      )}
      {isGod && !collapsed && <Crown className="w-3 h-3 flex-shrink-0" style={{ color: 'oklch(0.85 0.20 0)' }} />}
    </Link>
  )

  return (
    <div className="flex h-screen overflow-hidden relative">
      <AuroraBackground />

      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden md:flex flex-col flex-shrink-0 transition-all duration-300 relative z-10',
        'bg-[var(--color-surface)]/80 backdrop-blur-xl border-r border-[var(--color-border)]',
        collapsed ? 'w-[52px]' : 'w-52',
      )}>
        <div className="flex items-center gap-3 px-3 py-4 border-b border-[var(--color-border)]">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[oklch(0.82_0.16_196_/_0.10)] border border-[oklch(0.82_0.16_196_/_0.35)] flex items-center justify-center glow-teal">
            <Activity className="w-4 h-4 text-[var(--color-cyan)]" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-display font-black text-sm text-[var(--color-cyan)] text-glow-teal leading-tight tracking-wider">AURORA</div>
              <div className="font-display text-[9px] text-[var(--color-dim)] tracking-[0.2em] uppercase">problem → outcome</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-1.5">
          {NAV.map(({ path, icon: Icon, label }) => (
            <Link key={path} href={path} className={navClass(isActive(path))}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate font-display text-xs tracking-wide">{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-2 space-y-1">
          <UserBadge />
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Desktop main */}
      <div className="hidden md:flex flex-col flex-1 min-w-0 relative z-10">
        <main className="flex-1 overflow-y-auto grid-overlay">{children}</main>
      </div>

      {/* Mobile shell */}
      <div className="flex flex-col flex-1 min-w-0 md:hidden relative z-10">
        <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[oklch(0.82_0.16_196_/_0.10)] border border-[oklch(0.82_0.16_196_/_0.35)] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[var(--color-cyan)]" />
            </div>
            <span className="font-display font-black text-sm text-[var(--color-cyan)] text-glow-teal tracking-wider">AURORA</span>
            {isGod && <Crown className="w-3.5 h-3.5" style={{ color: 'oklch(0.85 0.20 0)' }} />}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto grid-overlay pb-20">{children}</main>

        <nav className="fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-xl border-t border-[var(--color-border)] md:hidden">
          <div className="flex items-stretch h-14" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {NAV.map(({ path, icon: Icon, label }) => {
              const active = isActive(path)
              return (
                <Link key={path} href={path}
                  className={clsx('flex-1 flex flex-col items-center justify-center gap-0.5 px-1 transition-all active:scale-95',
                    active ? 'text-[var(--color-cyan)]' : 'text-[var(--color-muted)]')}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[8px] font-display tracking-wide">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

/* ── Shared UI ─────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-[var(--color-border)]">
      <div>
        <h1 className="font-display font-bold text-lg md:text-xl text-[var(--color-text)] tracking-wide">{title}</h1>
        {subtitle && <p className="text-[10px] text-[var(--color-muted)] mt-0.5 font-display tracking-wide">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({ label, value, unit, delta, color = 'var(--color-cyan)' }: {
  label: string; value: string | number; unit?: string; delta?: string; color?: string
}) {
  return (
    <div className="card card-glow p-3 md:p-4">
      <div className="text-[9px] font-display tracking-[0.12em] uppercase text-[var(--color-muted)] mb-1.5">{label}</div>
      <div className="flex items-end gap-1">
        <span className="mono text-xl md:text-2xl font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-[10px] text-[var(--color-muted)] mb-0.5">{unit}</span>}
      </div>
      {delta && <div className="text-[9px] text-[var(--color-muted)] mt-1">{delta}</div>}
    </div>
  )
}

export function StatusDot({ status }: { status: 'active' | 'idle' | 'conflict' | 'off' | 'error' }) {
  const colors: Record<string, string> = {
    active: 'var(--color-green)', idle: 'var(--color-muted)',
    conflict: 'var(--color-amber)', off: 'var(--color-dim)', error: 'var(--color-red)',
  }
  return <span className="status-dot pulse-dot flex-shrink-0" style={{ backgroundColor: colors[status] ?? colors.idle }} />
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3 md:mb-4">
      <span className="text-[10px] font-display font-bold tracking-[0.15em] uppercase text-[var(--color-muted)]">{children}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}
