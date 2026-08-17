import React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Zap, Activity, Heart, Wind, Battery, Thermometer, RefreshCw } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
import { useRealtime } from '../hooks/useRealtime'
import { useAuroraEngine } from '../hooks/useAuroraEngine'

type Msg = { role: 'user' | 'assistant'; content: string; ts: number }

const STARTERS = [
  'Should I run the dryer right now?',
  'What does my stress data say about the last hour?',
  'How is air quality and what should I do about it?',
  'Optimize energy for the next 4 hours.',
  'Give me a full system status report.',
  'When is the best window to charge the battery tonight?',
]

function LiveBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <span className="mono text-[9px] text-[var(--color-dim)] w-10 flex-shrink-0">{label}</span>
      <div className="flex-1 h-0.5 bg-[var(--color-border)] rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className="mono text-[9px] font-bold w-10 text-right" style={{ color }}>{value}{unit}</span>
    </div>
  )
}

function StatChip({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: string; label: string; color: string
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
      style={{ borderColor: color + '25', background: color + '08' }}>
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <div>
        <div className="mono text-[10px] font-bold leading-none" style={{ color }}>{value}</div>
        <div className="mono text-[8px] text-[var(--color-dim)] leading-none mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full border border-[var(--color-teal)]/30 bg-[var(--color-teal)]/08 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="mono text-[8px] font-bold text-[var(--color-teal)]">J</span>
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[var(--color-teal)]/10 border border-[var(--color-teal)]/20 text-[var(--color-text)] rounded-br-sm'
            : 'bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        <span className="mono text-[8px] text-[var(--color-dim)] px-1">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full border border-[var(--color-teal)]/30 bg-[var(--color-teal)]/08 flex items-center justify-center flex-shrink-0">
        <span className="mono text-[8px] font-bold text-[var(--color-teal)]">J</span>
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[var(--color-elevated)] border border-[var(--color-border)] flex items-center gap-1.5">
        {[0, 0.15, 0.3].map(d => (
          <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: d }} />
        ))}
      </div>
    </motion.div>
  )
}

export function AIChat() {
  const metrics = useRealtime()
  const engine  = useAuroraEngine(metrics)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const metricsRef = useRef(metrics)
  const engineRef  = useRef(engine)
  metricsRef.current = metrics
  engineRef.current  = engine

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, streaming])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    setError(null)

    const userMsg: Msg = { role: 'user', content: text.trim(), ts: Date.now() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreamingText('')
    setStreaming(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Build live state context — the whole point of this OS
    const m = metricsRef.current
    const e = engineRef.current
    const tempC = ((m.temp - 32) / 1.8).toFixed(1)
    const auroraState = {
      score:          e.score,
      trend:          e.trend,
      predictedScore: e.predictedScore,
      mode:           'balanced',
      energy: {
        solar_kw:        m.solar,
        load_kw:         m.load,
        grid_kw:         m.grid,
        battery_soc_pct: m.batterySoc,
        battery_current_a: m.batteryCurrent,
        battery_charging: m.batteryCurrent > 0,
        net_solar_surplus_w: Math.round((m.solar - m.load) * 1000),
      },
      biometrics: {
        heart_rate_bpm: m.heartRate,
        hrv_ms:         m.hrv,
        spo2_pct:       m.spo2,
        stress_index:   m.stress,
      },
      environment: {
        co2_ppm:          m.co2,
        temp_f:           m.temp,
        temp_c:           parseFloat(tempC),
        humidity_pct:     m.humidity,
        pm25_ugm3:        m.pm25,
        air_quality:      m.co2 < 600 ? 'excellent' : m.co2 < 800 ? 'good' : m.co2 < 1000 ? 'fair' : 'poor',
      },
      active_signals: e.signals.map(s => ({
        severity: s.severity,
        message:  s.message,
        recommendation: s.recommendation,
      })),
      timestamp_utc: new Date().toISOString(),
    }

    try {
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, auroraState }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      // Stream the response
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = '', full = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') break
          try {
            const p = JSON.parse(d)
            if (p.token) { full += p.token; setStreamingText(full) }
          } catch { /* */ }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full || '(no response)', ts: Date.now() }])
      setStreamingText('')
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = (e as Error).message
      setError(msg.includes('API_KEY') || msg.includes('503')
        ? 'JARVIS offline — add ANTHROPIC_API_KEY in Vercel environment variables.'
        : msg)
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming])

  const scoreColor = engine.score >= 80 ? '#39ff14' : engine.score >= 60 ? '#00ffc8' : engine.score >= 40 ? '#ffd60a' : '#ff3366'
  const tempC = ((metrics.temp - 32) / 1.8).toFixed(1)

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Header with live state strip ─────────────────────── */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)]"
          style={{ background: 'rgba(5,11,18,0.95)', backdropFilter: 'blur(20px)' }}>

          {/* Title row */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-pulse" style={{ boxShadow: '0 0 6px #00ffc8' }} />
                <span className="display font-black text-sm text-[var(--color-teal)] tracking-wide">JARVIS</span>
                <span className="mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-dim)]">aurora-core</span>
              </div>
              <div className="mono text-[9px] text-[var(--color-dim)] pl-4">grounded in live sensor state</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mono text-[9px] text-[var(--color-dim)]">SCORE</span>
              <motion.span key={engine.score}
                initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                className="display font-black text-lg" style={{ color: scoreColor }}>
                {engine.score}
              </motion.span>
              <span className="mono text-[9px]" style={{ color: scoreColor }}>
                {engine.trend === 'improving' ? '↗' : engine.trend === 'degrading' ? '↘' : '→'}
              </span>
            </div>
          </div>

          {/* Live sensor strip — scrollable */}
          <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto">
            <StatChip icon={Zap}          value={`${metrics.solar}kW`}             label="SOLAR"   color="#39ff14" />
            <StatChip icon={Battery}      value={`${metrics.batterySoc.toFixed(0)}%`} label="BATT"  color="#00ffc8" />
            <StatChip icon={Activity}     value={`${metrics.load}kW`}              label="LOAD"    color="#ffd60a" />
            <StatChip icon={Heart}        value={`${metrics.heartRate}`}            label="HR bpm"  color="#ff3366" />
            <StatChip icon={Wind}         value={`${metrics.co2}`}                 label="CO₂ ppm" color={metrics.co2 > 1000 ? '#ff3366' : metrics.co2 > 800 ? '#ffd60a' : '#39ff14'} />
            <StatChip icon={Thermometer}  value={`${tempC}°C`}                     label="TEMP"    color="#9b5de5" />
          </div>

          {/* Active signals — shown only if any */}
          <AnimatePresence>
            {engine.signals.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-[var(--color-border)]"
              >
                <div className="flex gap-2 px-4 py-2 overflow-x-auto">
                  {engine.signals.slice(0, 4).map(sig => (
                    <div key={sig.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg flex-shrink-0"
                      style={{
                        background: (sig.severity === 'alert' ? '#ff3366' : sig.severity === 'warn' ? '#ffd60a' : '#00ffc8') + '10',
                        border: `1px solid ${sig.severity === 'alert' ? '#ff336630' : sig.severity === 'warn' ? '#ffd60a30' : '#00ffc820'}`,
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                        backgroundColor: sig.severity === 'alert' ? '#ff3366' : sig.severity === 'warn' ? '#ffd60a' : '#00ffc8'
                      }} />
                      <span className="mono text-[9px] text-[var(--color-muted)]">{sig.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Messages ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: 16 }}>

          {messages.length === 0 && !streaming && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5 pt-4">
              <div className="text-center space-y-1">
                <div className="display font-black text-base text-[var(--color-text)]">
                  JARVIS is online
                </div>
                <p className="text-[11px] text-[var(--color-muted)] max-w-xs mx-auto leading-relaxed">
                  I have your live sensor state. Ask me anything about what's happening right now — or tell me what to do.
                </p>
              </div>

              <div className="grid gap-2">
                {STARTERS.map((s, i) => (
                  <motion.button key={s}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => send(s)}
                    className="text-left px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 hover:border-[var(--color-teal)]/30 hover:bg-[var(--color-teal)]/05 transition-all group"
                  >
                    <span className="text-xs text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors">{s}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          </AnimatePresence>

          {/* Streaming message */}
          {streaming && streamingText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full border border-[var(--color-teal)]/30 bg-[var(--color-teal)]/08 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="mono text-[8px] font-bold text-[var(--color-teal)]">J</span>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-[var(--color-elevated)] border border-[var(--color-teal)]/20 text-sm text-[var(--color-text)] leading-relaxed max-w-[82%]">
                {streamingText}
                <span className="inline-block w-0.5 h-3.5 bg-[var(--color-teal)] ml-0.5 animate-pulse align-middle" />
              </div>
            </motion.div>
          )}

          {streaming && !streamingText && <TypingIndicator />}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="px-3.5 py-2.5 rounded-xl border border-[#ffd60a]/20 bg-[#ffd60a]/05 text-xs text-[#ffd60a]">
              ⚠ {error}
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-[var(--color-border)]"
          style={{ background: 'rgba(5,11,18,0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-end gap-2">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setError(null); setStreamingText('') }}
                className="p-2 rounded-lg text-[var(--color-dim)] hover:text-[var(--color-muted)] hover:bg-[var(--color-elevated)] transition-colors flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="flex-1 flex items-end gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] focus-within:border-[var(--color-teal)]/30 transition-colors">
              <textarea ref={textareaRef} rows={1} value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder="Ask JARVIS…"
                className="flex-1 bg-transparent outline-none resize-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] leading-relaxed"
                style={{ maxHeight: 100 }}
              />
              <button onClick={() => send(input)} disabled={!input.trim() || streaming}
                className="p-1.5 rounded-lg transition-all disabled:opacity-30 flex-shrink-0 text-[var(--color-teal)] hover:bg-[var(--color-teal)]/10">
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
