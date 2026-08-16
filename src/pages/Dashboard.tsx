import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'wouter'
import { ArrowUpRight, Sparkles, Zap, Sun, Battery, Brain, Wind, Heart } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { SystemHealthGauge } from '../components/SystemHealthGauge'
import { EnergyFlow } from '../components/EnergyFlow'
import { StatusDot, SectionLabel } from '../components/Layout'
import { useRealtime } from '../lib/useRealtime'
import { useSystemAlerts } from '../lib/toast'
import { agents, layers, initialAlerts } from '../lib/seed'
import { useAuth } from '../lib/auth'

type PowerPoint = { t: string; load: number; solar: number; grid: number }

function rng(base: number, v: number) { return +(base + (Math.random() - 0.5) * v * 2).toFixed(2) }

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const h = t.getHours(), isDay = h >= 6 && h <= 20
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{isDay ? '🌤️' : '🌙'}</span>
      <div className="text-right">
        <div className="mono text-sm font-medium text-[var(--color-text)]">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div className="mono text-[9px] text-[var(--color-muted)]">{t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, unit, sub, color, href }: {
  icon: typeof Zap; label: string; value: string | number; unit?: string; sub?: string; color: string; href?: string
}) {
  const inner = (
    <motion.div whileHover={{ y: -3, scale: 1.02 }} transition={{ type: 'spring', stiffness: 400 }}
      className="card card-glow p-4 relative overflow-hidden cursor-default group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        style={{ background: `radial-gradient(ellipse at 20% 120%, ${color}12, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {href && <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="mono text-[9px] text-[var(--color-muted)] tracking-[0.15em] uppercase mb-1">{label}</div>
      <motion.div key={String(value)} initial={{ opacity: 0.5, y: 3 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end gap-1">
        <span className="display font-black text-2xl leading-none" style={{ color }}>{value}</span>
        {unit && <span className="mono text-[10px] text-[var(--color-muted)] mb-0.5">{unit}</span>}
      </motion.div>
      {sub && <div className="mono text-[9px] text-[var(--color-muted)] mt-1.5">{sub}</div>}
    </motion.div>
  )
  return href ? <Link href={href}><a className="block">{inner}</a></Link> : inner
}

export function Dashboard() {
  const live = useRealtime()
  const { user, isGod } = useAuth()
  useSystemAlerts()

  const [chart, setChart] = useState<PowerPoint[]>(() =>
    Array.from({ length: 60 }, (_, i) => ({
      t: `T-${59 - i}`,
      solar: i > 20 && i < 55 ? rng(3.4, 0.8) : rng(0.2, 0.2),
      load: rng(2.2, 0.9), grid: rng(0.8, 0.4),
    }))
  )
  const tick = useRef(0)
  useEffect(() => {
    const id = setInterval(() => {
      tick.current++
      const h = new Date().getHours()
      const solar = h >= 7 && h <= 19 ? rng(live.solar, 0.15) : 0
      const load = rng(live.load, 0.12)
      setChart(p => [...p.slice(1), { t: `T-${tick.current}`, solar: Math.max(0, solar), load, grid: Math.max(0, load - solar) }])
    }, 3000)
    return () => clearInterval(id)
  }, [live.solar, live.load])

  const savings = +(live.solar * 6 * 0.14).toFixed(2)
  const selfSuf = Math.min(100, Math.round((live.solar / live.load) * 100))

  return (
    <PageTransition>
      <div>
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="display font-black text-xl text-[var(--color-text)] tracking-tight">Mission Control</h1>
              {isGod && <span className="mono text-[9px] px-2 py-0.5 rounded-full border gradient-text-god" style={{ borderColor: '#ffd60a40', background: '#ffd60a10' }}>⚡ GOD</span>}
            </div>
            <p className="mono text-[10px] text-[var(--color-muted)] mt-0.5">
              Aurora Core · L1–L7 <span className="text-[#39ff14]">●</span> All nominal · Hey {user?.name?.split(' ')[0]}
            </p>
          </div>
          <LiveClock />
        </div>

        <div className="p-4 md:p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>

          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Zap}     label="System Load"   value={live.load}        unit="kW" color="#ffd60a" sub={`Grid: ${live.grid.toFixed(2)} kW`}   href="/circuits" />
            <StatCard icon={Sun}     label="Solar Output"  value={live.solar}       unit="kW" color="#39ff14" sub="Generating now"                       href="/battery"  />
            <StatCard icon={Battery} label="Battery"       value={live.batterySoc}  unit="%"  color="#00ffc8" sub={`${live.batteryCurrent > 0 ? '▲ Chg' : '▼ Dch'} ${Math.abs(live.batteryCurrent)}A`} href="/battery" />
            <StatCard icon={Brain}   label="Agents"        value={agents.filter(a=>a.status==='active').length} unit={`/${agents.length}`} color="#9b5de5" sub={agents.some(a=>a.status==='conflict') ? '⚠ 1 conflict' : 'All nominal'} href="/agents" />
          </div>

          {/* Health + Energy Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SystemHealthGauge metrics={live} />
            <EnergyFlow metrics={live} />
          </div>

          {/* Today strip */}
          <div className="card aurora-gradient p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { l: "Today's Savings",   v: `$${savings}`,   c: '#39ff14', sub: 'vs grid-only'    },
                { l: 'Self-Sufficient',   v: `${selfSuf}%`,   c: '#00ffc8', sub: 'solar coverage'  },
                { l: 'System Score',      v: `${live.systemScore}`, c: '#9b5de5', sub: 'of 100 pts' },
              ].map(item => (
                <div key={item.l}>
                  <div className="display font-black text-2xl md:text-3xl" style={{ color: item.c }}>{item.v}</div>
                  <div className="mono text-[9px] text-[var(--color-muted)] mt-0.5">{item.l}</div>
                  <div className="mono text-[8px] text-[var(--color-dim)]">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live power chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Live Power</SectionLabel>
              <span className="mono text-[9px] text-[#39ff14] flex items-center gap-1">
                <span className="status-dot pulse-dot" style={{ backgroundColor: '#39ff14', width: 5, height: 5 }} />
                Updating every 3s
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chart} margin={{ top: 2, right: 2, left: -26, bottom: 0 }}>
                <defs>
                  {[['gl','#ffd60a'],['gs','#39ff14'],['gg','#00ffc8']].map(([id,c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={c} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#132030" />
                <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#5a8a9f', fontFamily: 'JetBrains Mono' }} interval={14} />
                <YAxis tick={{ fontSize: 8, fill: '#5a8a9f', fontFamily: 'JetBrains Mono' }} unit="kW" />
                <Tooltip contentStyle={{ background: 'rgba(9,18,25,0.95)', border: '1px solid #132030', borderRadius: 10, fontSize: 11, backdropFilter: 'blur(12px)' }} />
                <Area type="monotone" dataKey="load"  name="Load"  stroke="#ffd60a" fill="url(#gl)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#39ff14" fill="url(#gs)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="grid"  name="Grid"  stroke="#00ffc8" fill="url(#gg)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Agents + Layers grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/agents">
              <a className="card p-4 block hover:card-active transition-all group">
                <SectionLabel>AI Agent Consensus</SectionLabel>
                <div className="space-y-2.5">
                  {agents.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <StatusDot status={a.status} />
                      <span className="display font-semibold text-xs text-[var(--color-text)] w-22 flex-shrink-0">{a.name}</span>
                      <span className="mono text-[10px] text-[var(--color-muted)] flex-1 truncate">{a.action}</span>
                      <span className="mono text-xs flex-shrink-0 font-bold" style={{ color: a.color }}>{a.confidence}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-[#00ffc8] opacity-0 group-hover:opacity-100 transition-opacity">
                  View all agents <ArrowUpRight className="w-3 h-3" />
                </div>
              </a>
            </Link>

            <Link href="/layers">
              <a className="card p-4 block hover:card-active transition-all group">
                <SectionLabel>Cognitive Stack</SectionLabel>
                <div className="space-y-2">
                  {layers.map(l => (
                    <div key={l.id} className="flex items-center gap-2.5">
                      <StatusDot status={l.status as 'active' | 'conflict'} />
                      <span className="mono text-[9px] text-[var(--color-dim)] w-18 flex-shrink-0">{l.abbr}</span>
                      <span className="display text-xs text-[var(--color-text)] flex-1 truncate">{l.name}</span>
                      <span className="mono text-[9px] flex-shrink-0 font-bold" style={{ color: l.color }}>{l.throughput}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-[#00ffc8] opacity-0 group-hover:opacity-100 transition-opacity">
                  View all layers <ArrowUpRight className="w-3 h-3" />
                </div>
              </a>
            </Link>
          </div>

          {/* Env strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Wind,   label: 'CO₂',   value: `${live.co2}`,     unit: 'ppm',   color: live.co2 > 700 ? '#ff3366' : '#00ffc8' },
              { icon: Heart,  label: 'HR',    value: `${live.heartRate}`,unit: 'bpm',   color: '#ff3366' },
              { icon: Battery,label: 'HRV',   value: `${live.hrv}`,     unit: 'ms',    color: '#9b5de5' },
              { icon: Sun,    label: 'Temp',  value: `${live.temp}`,    unit: '°F',    color: '#ffd60a' },
            ].map(m => (
              <div key={m.label} className="card p-3 text-center">
                <m.icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: m.color }} />
                <div className="mono text-sm font-bold leading-none" style={{ color: m.color }}>{m.value}</div>
                <div className="mono text-[8px] text-[var(--color-muted)] mt-0.5">{m.unit}</div>
                <div className="mono text-[7px] text-[var(--color-dim)] mt-0.5 uppercase tracking-wider">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Recent alerts */}
          <div className="card p-4">
            <SectionLabel>Recent Activity</SectionLabel>
            <div className="space-y-2">
              {initialAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-start gap-3 py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span className={`mono text-[8px] mt-0.5 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                    alert.type === 'warning' ? 'bg-[#ffd60a15] text-[#ffd60a]'
                    : alert.type === 'error'  ? 'bg-[#ff336615] text-[#ff3366]'
                    : alert.type === 'success'? 'bg-[#39ff1415] text-[#39ff14]'
                    :                           'bg-[#00ffc810] text-[#00ffc8]'}`}>
                    {alert.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="display font-semibold text-xs text-[var(--color-text)] truncate">{alert.title}</div>
                    <div className="mono text-[9px] text-[var(--color-muted)] truncate mt-0.5">{alert.message}</div>
                  </div>
                  <span className="mono text-[9px] text-[var(--color-dim)] flex-shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AURORA CTA */}
          <Link href="/chat">
            <motion.a whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="card p-4 flex items-center gap-4 cursor-pointer group block"
              style={{ background: 'linear-gradient(135deg, #00ffc808, #9b5de508)', borderColor: '#00ffc820' }}>
              <div className="w-11 h-11 rounded-xl border border-[#00ffc840] bg-[#00ffc810] flex items-center justify-center glow-teal flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#00ffc8]" />
              </div>
              <div className="flex-1">
                <div className="display font-bold text-sm text-[var(--color-text)]">Ask AURORA</div>
                <div className="mono text-[9px] text-[var(--color-muted)]">Active decision core · 3 tools · Groq Llama 3.1</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#00ffc8] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          </Link>

          {/* Footer */}
          <div className="text-center py-2">
            <span className="mono text-[8px] text-[var(--color-dim)] tracking-[0.2em] uppercase">Aurora Core v2.0 · McLain Systems · Built for Zachary 💙</span>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
