/**
 * Aurora Core — J.A.R.V.I.S. Panel v3
 * Real Claude AI via /api/chat with streaming SSE.
 * Full Iron Man aesthetic: HUD rings, waveform, holographic UI.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, Square, Zap, Activity, Wind, Bot } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'user' | 'jarvis' | 'system'
interface Msg { id: string; role: Role; text: string; ts: number; tool?: string }

interface AuroraState {
  score: number; mode: string
  energy: number; bio: number; env: number
  load: number; solar: number; battery: number
  hr: number; hrv: number; stress: number
  co2: number; temp: number; humidity: number
}

// ── Live simulation ───────────────────────────────────────────────────────────

function makeSeed(): AuroraState {
  return { score: 87, mode: 'BALANCED', energy: 82, bio: 91, env: 88,
    load: 9.2, solar: 4.3, battery: 76, hr: 62, hrv: 54, stress: 16,
    co2: 598, temp: 71.8, humidity: 47 }
}

function jitter(s: AuroraState): AuroraState {
  const j = (v: number, r: number) => +Math.max(0, v + (Math.random() - .5) * r).toFixed(1)
  const ji = (v: number, r: number) => Math.round(Math.max(0, v + (Math.random() - .5) * r))
  const solar = j(s.solar, .14); const load = j(s.load, .07)
  const bat = +Math.min(98, Math.max(20, s.battery + (Math.random() > .6 ? -.04 : .02))).toFixed(1)
  const hr = ji(s.hr, 1); const hrv = ji(s.hrv, 1.5); const stress = ji(s.stress, 1.2)
  const co2 = ji(s.co2, 10); const temp = j(s.temp, .1); const hum = j(s.humidity, .4)
  const energy = Math.round(Math.min(100, (solar / load) * 50 + (bat / 100) * 50))
  const bio = Math.round(Math.min(100, (hrv / 75) * 40 + (1 - stress / 100) * 40 + 20))
  const env = Math.round(Math.max(0, 100 - (co2 - 400) / 8 * .5 - Math.abs(temp - 72) * 3))
  const score = Math.round(energy * .35 + bio * .35 + env * .3)
  return { ...s, solar, load, battery: bat, hr, hrv, stress, co2, temp, humidity: hum, energy, bio, env, score }
}

// ── HUD Score Ring ────────────────────────────────────────────────────────────

function HudRing({ value, max = 100, size = 80, stroke = 6, color, label, sublabel }:
  { value: number; max?: number; size?: number; stroke?: number; color: string; label: string; sublabel?: string }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, value / max)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none"/>
        {/* Glow ring */}
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke + 2} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `blur(3px)`, opacity: 0.3, transition: 'stroke-dashoffset .8s ease' }}/>
        {/* Main ring */}
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset .8s ease, stroke .4s ease' }}/>
        {/* Value */}
        <text x={size/2} y={size/2 - 2} textAnchor="middle" fontSize={size * 0.2} fill={color} fontWeight="800" fontFamily="var(--font-display)">{value}</text>
        {sublabel && <text x={size/2} y={size/2 + 11} textAnchor="middle" fontSize={size * 0.1} fill={color} opacity={0.6} fontFamily="var(--font-display)">{sublabel}</text>}
      </svg>
      <div className="text-[9px] font-display tracking-widest uppercase" style={{ color, opacity: 0.7 }}>{label}</div>
    </div>
  )
}

// ── Waveform visualizer ───────────────────────────────────────────────────────

function Waveform({ active }: { active: boolean }) {
  const bars = 28
  return (
    <div className="flex items-center justify-center gap-[2px] h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div key={i}
          className="w-[2px] rounded-full"
          style={{ background: 'var(--color-cyan)', opacity: active ? 0.9 : 0.2 }}
          animate={active ? {
            height: [3, Math.random() * 18 + 4, 3],
            opacity: [0.4, 1, 0.4],
          } : { height: 3 }}
          transition={active ? {
            duration: 0.4 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.04,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  )
}

// ── Tool chip ─────────────────────────────────────────────────────────────────

function ToolChip({ name }: { name: string }) {
  const label = name.replace(/aurora_/g, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <motion.span initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-display tracking-wider border"
      style={{ borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)', background: 'rgba(0,255,255,0.05)' }}>
      <span className="w-1 h-1 rounded-full bg-[var(--color-cyan)] animate-pulse" />
      {label}
    </motion.span>
  )
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function Md({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, li, arr) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((chunk, ci) =>
            chunk.startsWith('**') && chunk.endsWith('**')
              ? <strong key={ci} className="text-[var(--color-text)] font-bold">{chunk.slice(2,-2)}</strong>
              : <span key={ci}>{chunk}</span>
          )}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Msg }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center my-1">
        <div className="text-[9px] font-display tracking-widest px-3 py-1 rounded-full"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          {msg.text}
        </div>
      </div>
    )
  }
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center"
          style={{ background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)' }}>
          <Bot size={14} style={{ color: 'var(--color-cyan)' }} />
        </div>
      )}
      <div className={`max-w-[85%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {msg.tool && <ToolChip name={msg.tool} />}
        {msg.text && (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'text-[var(--color-cyan)] rounded-tr-sm'
              : 'text-[var(--color-muted)] rounded-tl-sm'
          }`} style={isUser
              ? { background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.15)' }
              : { background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }
          }>
            <Md text={msg.text} />
          </div>
        )}
        <div className="text-[9px] px-1" style={{ color: 'var(--color-dim)' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Quick commands ────────────────────────────────────────────────────────────

const QUICK = [
  { l: 'System status',  t: 'Give me a full system status report.' },
  { l: 'Sleep mode',     t: 'Optimize everything for sleep tonight.' },
  { l: 'Energy',         t: 'How is my solar and battery?' },
  { l: 'Air quality',    t: 'Check the air quality.' },
  { l: 'Biometrics',     t: 'How are my biometrics?' },
  { l: 'Alerts',         t: 'Any active alerts or issues I should know about?' },
]

const STARTERS = [
  { icon: '⚡', t: 'Give me a full system status report.' },
  { icon: '🔋', t: 'How is my solar and battery right now?' },
  { icon: '❤️', t: 'How are my biometrics looking?' },
  { icon: '💨', t: 'Check the air quality inside.' },
  { icon: '🌙', t: 'Optimize everything for sleep tonight.' },
  { icon: '⚠️', t: 'Any active alerts or issues?' },
]

// ── Mode config ───────────────────────────────────────────────────────────────

const MODE_COLOR: Record<string, string> = {
  ENERGY_GUARDIAN:   '#f59e0b',
  HEALTH_SENTINEL:   '#ef4444',
  HABITAT_OPTIMIZER: '#10b981',
  BALANCED:          '#06b6d4',
}
const MODE_LABEL: Record<string, string> = {
  ENERGY_GUARDIAN:   'Energy Guardian',
  HEALTH_SENTINEL:   'Health Sentinel',
  HABITAT_OPTIMIZER: 'Habitat Optimizer',
  BALANCED:          'Balanced',
}

// ── Main Component ────────────────────────────────────────────────────────────

export function JarvisPanel() {
  const [msgs,       setMsgs]      = useState<Msg[]>([])
  const [input,      setInput]     = useState('')
  const [streaming,  setStreaming]  = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [voiceOn,    setVoiceOn]   = useState(false)
  const [aurora,     setAurora]    = useState<AuroraState>(makeSeed)
  const [apiOk,      setApiOk]     = useState<boolean | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const histRef   = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  // Live jitter
  useEffect(() => {
    const id = setInterval(() => setAurora(s => jitter(s)), 2500)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, streaming])

  // Probe API on mount
  useEffect(() => {
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }], auroraState: aurora }),
    }).then(r => setApiOk(r.ok || r.status !== 503)).catch(() => setApiOk(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────

  const send = useCallback(async (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || isThinking) return
    setInput('')

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: t, ts: Date.now() }
    setMsgs(prev => [...prev, userMsg])
    histRef.current.push({ role: 'user', content: t })

    setIsThinking(true)
    setStreaming('')
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: histRef.current.slice(-20),
          auroraState: aurora,
        }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMsgs(prev => [...prev, {
          id: `j-${Date.now()}`, role: 'jarvis',
          text: `⚠ ${(err as { error?: string }).error ?? 'Request failed. Check API configuration.'}`,
          ts: Date.now(),
        }])
        setIsThinking(false)
        return
      }

      // Stream SSE tokens
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let full = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') continue
          try {
            const p = JSON.parse(d) as { token?: string }
            if (p.token) { full += p.token; setStreaming(full) }
          } catch { /**/ }
        }
      }

      histRef.current.push({ role: 'assistant', content: full })
      setMsgs(prev => [...prev, { id: `j-${Date.now()}`, role: 'jarvis', text: full, ts: Date.now() }])
      setStreaming('')
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setMsgs(prev => [...prev, {
          id: `j-${Date.now()}`, role: 'jarvis',
          text: 'Connection lost. Check network or API key configuration.',
          ts: Date.now(),
        }])
      }
    } finally {
      setIsThinking(false)
      inputRef.current?.focus()
    }
  }, [input, isThinking, aurora])

  const stop = () => {
    abortRef.current?.abort()
    setIsThinking(false)
    setStreaming('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const modeColor = MODE_COLOR[aurora.mode] ?? '#06b6d4'
  const busy = isThinking || !!streaming

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-120px)]" style={{ background: 'var(--color-bg)' }}>

        {/* ═══ HEADER / HUD ═══════════════════════════════════════════════ */}
        <div className="flex-shrink-0 px-4 md:px-6 pt-3 pb-2"
          style={{ borderBottom: '1px solid var(--color-border)' }}>

          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-cyan)', boxShadow: '0 0 8px var(--color-cyan)' }} />
                <span className="font-display font-black text-xl tracking-[0.2em]" style={{ color: 'var(--color-cyan)' }}>J.A.R.V.I.S.</span>
                {apiOk === false && (
                  <span className="text-[8px] font-display px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    DEMO MODE
                  </span>
                )}
                {apiOk === true && (
                  <span className="text-[8px] font-display px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                    AI LIVE
                  </span>
                )}
              </div>
              <div className="text-[9px] font-display tracking-widest" style={{ color: 'var(--color-dim)' }}>
                JUST A RATHER VERY INTELLIGENT SYSTEM · AURORA CORE v2
              </div>
              <div className="text-[9px] font-display mt-0.5" style={{ color: modeColor, opacity: 0.8 }}>
                ◈ {MODE_LABEL[aurora.mode] ?? aurora.mode}
              </div>
            </div>

            {/* Score rings */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex gap-3">
                <HudRing value={aurora.energy} color="#f59e0b" label="ENERGY" size={60} stroke={5} />
                <HudRing value={aurora.bio}    color="#ef4444" label="BIO"    size={60} stroke={5} />
                <HudRing value={aurora.env}    color="#10b981" label="ENV"    size={60} stroke={5} />
              </div>
              <HudRing value={aurora.score} color={modeColor} label="SCORE" sublabel="/100" size={72} stroke={6} />
            </div>
          </div>

          {/* Live stat strip */}
          <div className="flex gap-0 mt-2 overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6"
            style={{ borderTop: '1px solid var(--color-border)' }}>
            {[
              { icon: <Zap size={9}/>,      label: 'SOLAR',   val: `${aurora.solar}kW`,   col: '#f59e0b' },
              { icon: <Zap size={9}/>,      label: 'LOAD',    val: `${aurora.load}kW`,    col: 'var(--color-muted)' },
              { icon: null,                 label: 'BATTERY', val: `${aurora.battery}%`,  col: aurora.battery < 30 ? '#ef4444' : '#06b6d4' },
              { icon: <Activity size={9}/>, label: 'HR',      val: `${aurora.hr}bpm`,     col: '#ef4444' },
              { icon: <Activity size={9}/>, label: 'HRV',     val: `${aurora.hrv}ms`,     col: '#10b981' },
              { icon: <Activity size={9}/>, label: 'STRESS',  val: `${aurora.stress}`,    col: aurora.stress > 60 ? '#f59e0b' : 'var(--color-muted)' },
              { icon: <Wind size={9}/>,     label: 'CO₂',     val: `${aurora.co2}ppm`,    col: aurora.co2 > 800 ? '#f59e0b' : '#10b981' },
              { icon: null,                 label: 'TEMP',    val: `${aurora.temp}°F`,    col: 'var(--color-muted)' },
              { icon: null,                 label: 'HUM',     val: `${aurora.humidity}%`, col: 'var(--color-muted)' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
                style={{ borderRight: '1px solid var(--color-border)' }}>
                {s.icon && <span style={{ color: s.col }}>{s.icon}</span>}
                <div>
                  <div className="text-[7px] font-display leading-none" style={{ color: 'var(--color-dim)' }}>{s.label}</div>
                  <div className="text-[11px] font-display font-bold leading-none mt-0.5" style={{ color: s.col }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ MESSAGES ════════════════════════════════════════════════════ */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">

          {/* Empty state */}
          {msgs.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-2">
              <div className="flex flex-col items-center gap-3 py-4">
                {/* Animated JARVIS orb */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ border: '1px solid rgba(6,182,212,0.3)' }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}/>
                  <motion.div className="absolute inset-3 rounded-full"
                    style={{ border: '1px solid rgba(6,182,212,0.5)' }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}/>
                  <Bot size={28} style={{ color: 'var(--color-cyan)', filter: 'drop-shadow(0 0 8px var(--color-cyan))' }} />
                </div>
                <div className="text-center">
                  <div className="font-display font-bold tracking-widest text-sm" style={{ color: 'var(--color-cyan)' }}>
                    SYSTEMS ONLINE
                  </div>
                  <div className="text-[10px] font-display mt-1" style={{ color: 'var(--color-dim)' }}>
                    {apiOk === true ? 'AI intelligence active — ask me anything' : 'Running in simulation mode'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STARTERS.map(s => (
                  <button key={s.t} onClick={() => send(s.t)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all active:scale-[.97]"
                    style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <span className="text-xs leading-snug" style={{ color: 'var(--color-muted)' }}>{s.t.replace(/\.$/, '')}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map(m => <Bubble key={m.id} msg={m} />)}
          </AnimatePresence>

          {/* Streaming / thinking */}
          {(isThinking || streaming) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center"
                style={{ background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)' }}>
                <Bot size={14} style={{ color: 'var(--color-cyan)' }} />
              </div>
              <div className="max-w-[85%] flex flex-col gap-1.5">
                {!streaming && isThinking && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-sm"
                    style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
                    <Waveform active={true} />
                  </div>
                )}
                {streaming && (
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                    style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                    <Md text={streaming} />
                    <motion.span className="inline-block w-0.5 h-3.5 ml-0.5 rounded align-middle"
                      style={{ background: 'var(--color-cyan)' }}
                      animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* ═══ INPUT ═══════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 px-4 md:px-6 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--color-border)' }}>

          {/* Quick command chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {QUICK.map(q => (
              <button key={q.l} onClick={() => send(q.t)} disabled={busy}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-display tracking-wider transition-colors disabled:opacity-30 whitespace-nowrap"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.color = 'var(--color-cyan)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)' }}>
                {q.l}
              </button>
            ))}
          </div>

          {/* Main input row */}
          <div className="flex gap-2 items-center">
            {/* Mic */}
            <button onClick={() => setVoiceOn(v => !v)}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={voiceOn
                ? { border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }
                : { border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
              {voiceOn ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            {/* Text input */}
            <div className="relative flex-1">
              <input ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={busy}
                placeholder={busy ? 'Processing…' : 'Command JARVIS — "start generator", "sleep mode", "system status"…'}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--color-elevated)',
                  border: `1px solid ${busy ? 'rgba(6,182,212,0.3)' : 'var(--color-border)'}`,
                  color: 'var(--color-text)',
                  opacity: busy ? 0.7 : 1,
                }}
              />
              {busy && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Waveform active={true} />
                </div>
              )}
            </div>

            {/* Send / Stop */}
            {busy ? (
              <button onClick={stop}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                <Square size={13} />
              </button>
            ) : (
              <button onClick={() => send()} disabled={!input.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ border: '1px solid rgba(6,182,212,0.35)', background: 'rgba(6,182,212,0.08)', color: 'var(--color-cyan)' }}>
                <Send size={13} />
              </button>
            )}
          </div>

          {/* JARVIS status line */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Waveform active={busy} />
              <span className="text-[8px] font-display tracking-widest" style={{ color: 'var(--color-dim)' }}>
                {busy ? 'PROCESSING…' : 'STANDING BY'}
              </span>
            </div>
            <div className="text-[8px] font-display tracking-widest" style={{ color: 'var(--color-dim)' }}>
              ARCHON-RV1 · AURORA CORE v2
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
