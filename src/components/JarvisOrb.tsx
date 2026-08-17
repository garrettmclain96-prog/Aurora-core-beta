/**
 * JarvisOrb — Iron Man JARVIS floating assistant for Aurora Core
 * Features: persistent memory, proactive alerts, real Whisper STT,
 *           OpenAI TTS (onyx), live Aurora state injection, PWA notifications
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRealtime } from '../hooks/useRealtime'
import { useJarvisMemory } from '../hooks/useJarvisMemory'
import { useJarvisProactive, type ProactiveAlert } from '../hooks/useJarvisProactive'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
  mode?: 'voice' | 'text' | 'proactive'
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Status report.',
  "Optimize tonight's energy.",
  'Any anomalies?',
  "What's my biggest load right now?",
  'Should I charge now or wait?',
  'Run a peak-shave simulation.',
]

const GREETINGS = [
  (session: number, name: string) =>
    session <= 1
      ? `Online, sir. Aurora Core initialized. Seven layers nominal. I'll be monitoring everything — you focus on the important things.`
      : `Welcome back, ${name}. Session ${session}. All systems nominal — with a few items that warrant your attention.`,
]

// ─── Arc Reactor ──────────────────────────────────────────────────────────────
function ArcReactor({ size = 28, pulse = false, active = false }: { size?: number; pulse?: boolean; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      style={{ animation: pulse ? 'jv-spin 10s linear infinite' : undefined }}>
      <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="0.6"
        opacity={active ? 0.35 : 0.18} />
      <circle cx="14" cy="14" r="9" stroke="white" strokeWidth="1"
        opacity={active ? 0.6 : 0.4} />
      <circle cx="14" cy="14" r="5.5" stroke="white" strokeWidth="1.4"
        opacity={active ? 0.85 : 0.65} />
      <circle cx="14" cy="14" r="3" fill="white"
        opacity={active ? 1 : 0.9} />
      {[0, 60, 120, 180, 240, 300].map(deg => {
        const r = (deg * Math.PI) / 180
        return <line key={deg}
          x1={14 + 6 * Math.cos(r)} y1={14 + 6 * Math.sin(r)}
          x2={14 + 8.5 * Math.cos(r)} y2={14 + 8.5 * Math.sin(r)}
          stroke="white" strokeWidth="1.2" opacity={active ? 0.65 : 0.45} />
      })}
    </svg>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 150, 300].map(d => (
        <div key={d} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-cyan)',
          animation: `jv-bounce 1s ease-in-out ${d}ms infinite`,
        }} />
      ))}
    </div>
  )
}

function VoiceWave({ color = 'var(--color-red)' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
      {[1, 3, 5, 4, 3, 5, 2, 4, 3, 2].map((h, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2, background: color,
          height: h * 3,
          animation: `jv-wave 0.7s ease-in-out ${i * 70}ms infinite alternate`,
        }} />
      ))}
    </div>
  )
}

// ─── Audio Recorder ────────────────────────────────────────────────────────────
function useRecorder() {
  const mr = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)

  const start = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.current = s
    const rec = new MediaRecorder(s)
    chunks.current = []
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
    mr.current = rec
    rec.start(100)
  }

  const stop = (): Promise<Blob> => new Promise(resolve => {
    const rec = mr.current
    if (!rec) { resolve(new Blob()); return }
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      stream.current?.getTracks().forEach(t => t.stop())
      resolve(blob)
    }
    rec.stop()
  })

  return { start, stop }
}

// ─── Audio helpers ─────────────────────────────────────────────────────────────
function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = reject
      audio.play().catch(reject)
    } catch (e) { reject(e) }
  })
}

function speakBrowser(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find(v => v.name === 'Daniel')
          || voices.find(v => v.lang === 'en-GB')
          || voices.find(v => v.lang.startsWith('en'))
          || null
  u.rate = 0.88; u.pitch = 0.72; u.volume = 0.95
  window.speechSynthesis.speak(u)
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function JarvisOrb() {
  const live = useRealtime()
  const {
    memory,
    appendHistory,
    learnFromResponse,
    buildMemoryContext,
    clearMemory,
  } = useJarvisMemory()

  const [open, setOpen]               = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [recording, setRecording]     = useState(false)
  const [processing, setProcessing]   = useState(false)
  const [voiceMode, setVoiceMode]     = useState<'tts' | 'browser' | 'off'>('browser')
  const [showStatus, setShowStatus]   = useState(false)
  const [showMemory, setShowMemory]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [notifDone, setNotifDone]     = useState(false)
  const [phase, setPhase]             = useState(0)
  const [proactiveCount, setProactiveCount] = useState(0)
  const [speaking, setSpeaking]       = useState(false)

  const endRef   = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { start: startRec, stop: stopRec } = useRecorder()

  // Orb pulse
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 4), 1100)
    return () => clearInterval(id)
  }, [])

  // Preload voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {}
    }
  }, [])

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Proactive alert handler
  const handleProactiveAlert = useCallback((alert: ProactiveAlert) => {
    const msg: Message = {
      role: 'assistant',
      content: `⚡ ${alert.message}`,
      ts: alert.ts,
      mode: 'proactive',
    }
    setMessages(prev => [...prev, msg])
    setProactiveCount(c => c + 1)
    // Flash the orb open if critical
    if (alert.severity === 'critical') setOpen(true)
  }, [])

  // Proactive monitoring
  useJarvisProactive(live, voiceMode !== 'off', handleProactiveAlert)

  // Greeting on first open
  useEffect(() => {
    if (open && messages.filter(m => m.mode !== 'proactive').length === 0) {
      const greetFn = GREETINGS[0]
      const g = greetFn(memory.sessionCount, memory.userName)
      const msg: Message = { role: 'assistant', content: g, ts: new Date() }
      setMessages(prev => {
        // Keep any proactive alerts that came in before opening
        const proactives = prev.filter(m => m.mode === 'proactive')
        return [...proactives, msg]
      })
      if (voiceMode !== 'off') {
        if (voiceMode === 'browser') speakBrowser(g)
      }
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Speak helper ──────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (voiceMode === 'off') return
    setSpeaking(true)
    try {
      if (voiceMode === 'browser') {
        speakBrowser(text)
        setSpeaking(false)
        return
      }
      // TTS mode — try to get audio from Jarvis.js
      const res = await fetch('/api/Jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttsOnly: true, text }),
      })
      if (res.ok) {
        const data = await res.json() as { audio?: string }
        if (data.audio) { await playBase64Audio(data.audio); return }
      }
      speakBrowser(text)
    } catch { speakBrowser(text) }
    finally { setSpeaking(false) }
  }, [voiceMode])

  // ── Text → JARVIS (streaming SSE) ────────────────────────────────────────
  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setError(null)

    const userMsg: Message = { role: 'user', content: text.trim(), ts: new Date() }
    const history = [...messages.filter(m => m.mode !== 'proactive'), userMsg]
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Persist to memory
    appendHistory([{ role: 'user', content: text.trim() }])

    try {
      const memCtx = buildMemoryContext()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          auroraState: {
            battery: { soc: live.batterySoc, current: live.batteryCurrent },
            energy: { solar: live.solar, load: live.load, grid: live.grid },
            health: { heartRate: live.heartRate, hrv: live.hrv, spo2: live.spo2, stress: live.stress },
            environment: { co2: live.co2, temp: live.temp, humidity: live.humidity, pm25: live.pm25 },
            systemScore: live.systemScore,
            timestamp: new Date().toISOString(),
            memoryContext: memCtx,
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const ct = res.headers.get('content-type') ?? ''
      let reply = ''

      if (ct.includes('event-stream') || ct.includes('text/plain')) {
        const reader = res.body?.getReader()
        const dec = new TextDecoder()
        // Insert live streaming bubble
        setMessages(prev => [...prev, { role: 'assistant', content: '', ts: new Date() }])
        if (reader) {
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data:')) continue
              const d = line.slice(5).trim()
              if (d === '[DONE]') break
              try {
                const p = JSON.parse(d)
                const tok: string = p.token ?? p.delta?.text ?? p.choices?.[0]?.delta?.content ?? ''
                if (tok) {
                  reply += tok
                  setMessages(prev => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = { ...last, content: reply }
                    }
                    return updated
                  })
                }
              } catch { /* skip */ }
            }
          }
        }
      } else {
        const data = await res.json()
        reply = (data.content as { type: string; text?: string }[])?.find(b => b.type === 'text')?.text
              ?? data.response ?? data.message
              ?? "My apologies, sir. Something went sideways on the intelligence layer."
        setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: new Date() }])
      }

      if (reply) {
        appendHistory([{ role: 'assistant', content: reply }])
        learnFromResponse(reply)
        await speak(reply)
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      const display = msg.includes('503') || msg.includes('API_KEY')
        ? "No AI backend configured. Add ANTHROPIC_API_KEY to Vercel environment variables, sir."
        : `Intelligence layer unreachable: ${msg}`
      setError(display)
      const errMsg = "The intelligence layer is unreachable, sir. Check API keys in Vercel settings."
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, live, buildMemoryContext, appendHistory, learnFromResponse, speak])

  // ── Voice → Whisper → TTS ─────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (recording) {
      setRecording(false)
      setProcessing(true)
      try {
        const blob = await stopRec()
        const res = await fetch('/api/Jarvis', {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm' },
          body: blob,
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(e.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { transcript?: string; text?: string; audio?: string | null; error?: string }
        if (data.error) throw new Error(data.error)

        const transcript = data.transcript ?? ''
        const reply = data.text ?? ''

        if (transcript) {
          setMessages(prev => [...prev,
            { role: 'user', content: transcript, ts: new Date(), mode: 'voice' },
            { role: 'assistant', content: reply, ts: new Date(), mode: 'voice' },
          ])
          appendHistory([
            { role: 'user', content: transcript },
            { role: 'assistant', content: reply },
          ])
          if (reply) learnFromResponse(reply)
        }

        // Play TTS audio (already generated by Jarvis.js onyx voice)
        if (data.audio) {
          setSpeaking(true)
          await playBase64Audio(data.audio).catch(() => {})
          setSpeaking(false)
        } else if (reply && voiceMode !== 'off') {
          speakBrowser(reply)
        }

      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown'
        setError(msg.includes('OPENAI') || msg.includes('503')
          ? "Voice input needs OPENAI_API_KEY in Vercel environment variables."
          : `Voice error: ${msg}`)
      } finally {
        setProcessing(false)
      }
    } else {
      try {
        await startRec()
        setRecording(true)
      } catch {
        setError("Microphone access denied. Check browser permissions.")
      }
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
    setProactiveCount(0)
    window.speechSynthesis?.cancel()
  }

  // ── Visual state ───────────────────────────────────────────────────────────
  const glow = [
    '0 0 12px oklch(0.75 0.18 196/0.4), 0 0 32px oklch(0.75 0.18 196/0.12)',
    '0 0 18px oklch(0.75 0.18 196/0.58),0 0 48px oklch(0.75 0.18 196/0.2)',
    '0 0 24px oklch(0.75 0.18 196/0.78),0 0 62px oklch(0.75 0.18 196/0.3)',
    '0 0 18px oklch(0.75 0.18 196/0.58),0 0 48px oklch(0.75 0.18 196/0.2)',
  ][phase]

  const critGlow = '0 0 24px oklch(0.55 0.22 27/0.8), 0 0 60px oklch(0.55 0.22 27/0.35)'
  const hasCritical = messages.some(m => m.mode === 'proactive' && m.content.includes('critical'))
  const orbGlow = hasCritical && !open ? critGlow : glow

  const W = expanded ? 'min(600px, 95vw)' : 'min(420px, calc(100vw - 2rem))'
  const H = expanded ? 'min(740px, 92vh)' : 'min(580px, 82vh)'

  const voiceIcon  = voiceMode === 'tts' ? '🔊' : voiceMode === 'browser' ? '🔉' : '🔇'
  const cycleVoice = () => setVoiceMode(v => v === 'tts' ? 'browser' : v === 'browser' ? 'off' : 'tts')

  const unreadCount = proactiveCount + (open ? 0 : messages.filter(m => m.role === 'assistant' && m.mode !== 'proactive').length - 1)

  return (
    <>
      <style>{`
        @keyframes jv-spin   { to { transform: rotate(360deg); } }
        @keyframes jv-bounce { 0%,80%,100%{transform:scale(0.5);opacity:.3} 40%{transform:scale(1.25);opacity:1} }
        @keyframes jv-wave   { from{transform:scaleY(0.35)} to{transform:scaleY(1.65)} }
        @keyframes jv-up     { from{opacity:0;transform:translateY(18px)scale(.96)} to{opacity:1;transform:none} }
        @keyframes jv-notif  { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
        @keyframes jv-rec    { 0%,100%{box-shadow:0 0 0 0 oklch(0.55 0.22 27/0.65)} 50%{box-shadow:0 0 0 10px oklch(0.55 0.22 27/0)} }
        @keyframes jv-speak  { 0%,100%{box-shadow:0 0 0 0 oklch(0.75 0.18 196/0.65)} 50%{box-shadow:0 0 0 10px oklch(0.75 0.18 196/0)} }
        @keyframes jv-crit   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .jv-usr { background:oklch(0.82 0.16 196/0.08); border:1px solid oklch(0.82 0.16 196/0.2); border-radius:12px 12px 3px 12px; }
        .jv-ai  { background:oklch(0.15 0.03 196/0.9); border:1px solid oklch(0.82 0.16 196/0.1); border-radius:3px 12px 12px 12px; }
        .jv-pro { background:oklch(0.55 0.22 27/0.08); border:1px solid oklch(0.55 0.22 27/0.25); border-radius:8px; }
        .jv-q:hover { background:oklch(0.82 0.16 196/0.1)!important; border-color:oklch(0.82 0.16 196/0.42)!important; color:var(--color-cyan)!important; }
        .jv-c:hover { background:oklch(0.82 0.16 196/0.09)!important; color:var(--color-text)!important; }
        .jv-inp:focus { border-color:oklch(0.82 0.16 196/0.45)!important; outline:none; }
        .jv-mem-row:hover { background:oklch(0.82 0.16 196/0.05)!important; }
      `}</style>

      {/* ── Notification bubble ── */}
      {!open && !notifDone && (
        <div onClick={() => setOpen(true)} style={{
          position: 'fixed', bottom: '5.8rem', right: '1.25rem', zIndex: 49,
          maxWidth: 270, background: 'oklch(0.1 0.024 196/0.97)',
          border: '1px solid oklch(0.82 0.16 196/0.26)', borderRadius: 10,
          padding: '9px 12px', backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'jv-notif 0.3s ease', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--color-cyan)', letterSpacing: '0.14em', marginBottom: 3, textTransform: 'uppercase' }}>
                J.A.R.V.I.S. · SESSION {memory.sessionCount}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text)', lineHeight: 1.45 }}>
                {memory.sessionCount > 1
                  ? `Welcome back, ${memory.userName}. 3 active alerts. Systems monitoring active.`
                  : '3 active alerts. Agent conflict at 18:00. Battery discharge elevated.'}
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); setNotifDone(true) }}
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}

      {/* ── Orb button ── */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50,
        width: 52, height: 52, borderRadius: '50%',
        border: `1.5px solid oklch(0.82 0.16 196/${open ? '0.6' : '0.32'})`,
        background: 'radial-gradient(circle at 38% 32%, oklch(0.72 0.18 196), oklch(0.3 0.22 196))',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: orbGlow, transition: 'box-shadow 0.9s ease, transform 0.1s',
        outline: 'none',
        animation: hasCritical && !open ? 'jv-crit 1.5s ease-in-out infinite' : undefined,
      }}>
        <ArcReactor size={28} pulse={open} active={speaking} />
        {/* Unread badge */}
        {!open && proactiveCount > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--color-red)',
            border: '2px solid oklch(0.09 0.022 196)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', fontSize: 8, color: 'white', fontWeight: 700,
          }}>{proactiveCount > 9 ? '9+' : proactiveCount}</div>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.2rem', right: '1.5rem', zIndex: 50,
          width: W, height: H, display: 'flex', flexDirection: 'column',
          borderRadius: 16, overflow: 'hidden',
          background: 'oklch(0.09 0.022 196/0.97)',
          border: '1px solid oklch(0.82 0.16 196/0.17)',
          backdropFilter: 'blur(30px) saturate(1.6)',
          boxShadow: '0 0 80px oklch(0.75 0.18 196/0.09), 0 32px 80px rgba(0,0,0,0.7)',
          animation: 'jv-up 0.2s ease',
          transition: 'width 0.22s ease, height 0.22s ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '11px 14px', flexShrink: 0,
            borderBottom: '1px solid oklch(0.82 0.16 196/0.12)',
            background: 'oklch(0.12 0.027 196/0.7)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'radial-gradient(circle at 38% 32%, oklch(0.72 0.18 196), oklch(0.3 0.22 196))',
              border: '1px solid oklch(0.82 0.16 196/0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: speaking ? 'jv-speak 1s ease-in-out infinite' : undefined,
            }}>
              <ArcReactor size={20} pulse active={speaking} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--color-cyan)', letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                J.A.R.V.I.S.
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--color-muted)', letterSpacing: '0.08em' }}>
                AURORA CORE · {speaking ? '▶ SPEAKING' : 'SESSION ' + memory.sessionCount} · {memory.facts.length} FACTS LEARNED
              </div>
            </div>

            {/* Controls */}
            {[
              { t: 'Status',       i: '⚡',      a: showStatus,  fn: () => setShowStatus(s => !s) },
              { t: 'Memory',       i: '🧠',      a: showMemory,  fn: () => setShowMemory(s => !s) },
              { t: 'Voice: ' + voiceMode, i: voiceIcon, a: voiceMode !== 'off', fn: cycleVoice },
              { t: expanded ? 'Compact' : 'Expand', i: expanded ? '⊟' : '⊞', a: false, fn: () => setExpanded(e => !e) },
              { t: 'Clear chat',   i: '↺',       a: false,       fn: clearChat },
              { t: 'Close',        i: '×',        a: false,       fn: () => setOpen(false) },
            ].map(c => (
              <button key={c.t} className="jv-c" onClick={c.fn} title={c.t} style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: c.a ? 'oklch(0.82 0.16 196/0.12)' : 'transparent',
                border: `1px solid ${c.a ? 'oklch(0.82 0.16 196/0.36)' : 'oklch(0.82 0.16 196/0.12)'}`,
                color: c.a ? 'var(--color-cyan)' : 'var(--color-muted)',
                cursor: 'pointer', fontSize: c.i === '×' ? 16 : 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>{c.i}</button>
            ))}
          </div>

          {/* Live Status Bar */}
          {showStatus && (
            <div style={{
              padding: '7px 12px', flexShrink: 0,
              borderBottom: '1px solid oklch(0.82 0.16 196/0.09)',
              background: 'oklch(0.11 0.024 196/0.65)',
              display: 'flex', flexWrap: 'wrap', gap: 5,
            }}>
              {[
                { l: 'Battery', v: `${live.batterySoc}%`, c: live.batterySoc > 50 ? 'var(--color-green)' : live.batterySoc > 25 ? 'var(--color-amber)' : 'var(--color-red)' },
                { l: 'Solar',   v: `${live.solar} kW`,  c: 'var(--color-cyan)' },
                { l: 'Load',    v: `${live.load} kW`,   c: 'var(--color-amber)' },
                { l: 'Grid',    v: `+${live.grid} kW`,  c: live.grid > 8 ? 'var(--color-red)' : 'var(--color-muted)' },
                { l: 'HR',      v: `${live.heartRate}`, c: 'var(--color-red)' },
                { l: 'HRV',     v: `${live.hrv}ms`,     c: 'var(--color-green)' },
                { l: 'CO₂',     v: `${live.co2}ppm`,    c: live.co2 > 800 ? 'var(--color-red)' : live.co2 > 600 ? 'var(--color-amber)' : 'var(--color-green)' },
                { l: 'Score',   v: `${live.systemScore}`, c: 'var(--color-cyan)' },
              ].map(s => (
                <div key={s.l} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'oklch(0.14 0.028 196/0.7)',
                  border: '1px solid oklch(0.82 0.16 196/0.09)',
                  borderRadius: 5, padding: '3px 7px',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 8.5, color: 'var(--color-muted)' }}>{s.l}:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 8.5, color: s.c, fontWeight: 700 }}>{s.v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Memory Panel */}
          {showMemory && (
            <div style={{
              padding: '8px 12px', flexShrink: 0,
              borderBottom: '1px solid oklch(0.82 0.16 196/0.09)',
              background: 'oklch(0.11 0.024 196/0.65)',
              maxHeight: 160, overflowY: 'auto',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 8.5, color: 'var(--color-cyan)', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                🧠 JARVIS MEMORY — {memory.facts.length} facts · Session {memory.sessionCount}
              </div>
              {memory.facts.length === 0 ? (
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--color-muted)' }}>
                  No facts learned yet. Keep talking to JARVIS.
                </div>
              ) : (
                memory.facts.map(f => (
                  <div key={f.key} className="jv-mem-row" style={{
                    display: 'flex', gap: 8, padding: '3px 4px', borderRadius: 4,
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--color-cyan)', minWidth: 110 }}>{f.key.replace(/_/g, ' ')}:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--color-text)' }}>{f.value}</span>
                  </div>
                ))
              )}
              <button onClick={clearMemory} style={{
                marginTop: 6, fontSize: 9, fontFamily: 'monospace',
                background: 'transparent', border: '1px solid oklch(0.55 0.22 27/0.3)',
                borderRadius: 4, color: 'var(--color-red)', padding: '2px 8px', cursor: 'pointer',
              }}>Clear all memory</button>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, opacity: 0.45 }}>
                <ArcReactor size={44} pulse />
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--color-muted)', letterSpacing: '0.12em' }}>INITIALIZING INTELLIGENCE LAYER</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 8, alignItems: 'flex-start',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
                    background: msg.mode === 'proactive'
                      ? 'radial-gradient(circle at 38% 32%, oklch(0.65 0.22 27), oklch(0.35 0.2 27))'
                      : 'radial-gradient(circle at 38% 32%, oklch(0.72 0.18 196), oklch(0.3 0.22 196))',
                    border: '1px solid oklch(0.82 0.16 196/0.26)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArcReactor size={15} />
                  </div>
                )}

                <div
                  className={msg.role === 'user' ? 'jv-usr' : msg.mode === 'proactive' ? 'jv-pro' : 'jv-ai'}
                  style={{
                    maxWidth: '78%', padding: '9px 13px',
                    fontSize: 12.5, lineHeight: 1.58,
                    color: msg.role === 'user' ? 'var(--color-text)' : 'oklch(0.9 0.04 196)',
                    fontFamily: msg.role === 'assistant' ? "'JetBrains Mono', 'Courier New', monospace" : 'inherit',
                  }}
                >
                  {msg.mode === 'voice' && msg.role === 'user' && (
                    <span style={{ fontSize: 9, color: 'var(--color-cyan)', marginRight: 5, opacity: 0.7 }}>🎙</span>
                  )}
                  {msg.content}
                  <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 5, opacity: 0.5 }}>
                    {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.mode === 'proactive' && ' · PROACTIVE'}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
                    background: 'oklch(0.82 0.16 196/0.08)',
                    border: '1px solid oklch(0.82 0.16 196/0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 9, color: 'var(--color-cyan)', fontWeight: 700,
                  }}>GM</div>
                )}
              </div>
            ))}

            {(loading || processing) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: 'radial-gradient(circle at 38% 32%, oklch(0.72 0.18 196), oklch(0.3 0.22 196))',
                  border: '1px solid oklch(0.82 0.16 196/0.26)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ArcReactor size={15} pulse />
                </div>
                <div className="jv-ai">
                  {processing
                    ? <div style={{ padding: '9px 13px', fontFamily: 'monospace', fontSize: 10, color: 'var(--color-muted)' }}>Processing audio…</div>
                    : <TypingDots />
                  }
                </div>
              </div>
            )}

            {error && (
              <div style={{
                fontSize: 10, color: 'var(--color-red)', fontFamily: 'monospace',
                padding: '6px 10px', borderRadius: 6,
                background: 'oklch(0.55 0.22 27/0.06)',
                border: '1px solid oklch(0.55 0.22 27/0.2)',
              }}>⚠ {error}</div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick prompts */}
          {messages.filter(m => m.mode !== 'proactive').length <= 1 && !loading && (
            <div style={{ padding: '4px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} className="jv-q" onClick={() => sendText(p)} style={{
                  fontSize: 9.5, padding: '4px 9px', fontFamily: 'monospace',
                  background: 'transparent',
                  border: '1px solid oklch(0.82 0.16 196/0.17)',
                  borderRadius: 20, color: 'var(--color-muted)',
                  cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em',
                }}>{p}</button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '10px 12px', flexShrink: 0,
            borderTop: '1px solid oklch(0.82 0.16 196/0.11)',
            background: 'oklch(0.1 0.023 196/0.85)',
            display: 'flex', gap: 7, alignItems: 'center',
          }}>
            <button onClick={toggleRecording} disabled={loading || processing} title={recording ? 'Stop recording' : 'Voice input (Whisper)'} style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: recording ? 'oklch(0.55 0.22 27/0.16)' : 'transparent',
              border: `1px solid ${recording ? 'oklch(0.55 0.22 27/0.55)' : 'oklch(0.82 0.16 196/0.17)'}`,
              color: recording ? 'var(--color-red)' : 'var(--color-muted)',
              cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: recording ? 'jv-rec 1.1s ease-in-out infinite' : undefined,
              opacity: (loading || processing) ? 0.35 : 1,
              transition: 'all 0.15s',
            }}>
              {recording ? '⏹' : '🎙️'}
            </button>

            {recording ? (
              <div style={{
                flex: 1, height: 34, borderRadius: 8,
                background: 'oklch(0.55 0.22 27/0.07)',
                border: '1px solid oklch(0.55 0.22 27/0.22)',
                display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8,
              }}>
                <VoiceWave />
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-red)' }}>Recording… tap ⏹ to send</span>
              </div>
            ) : (
              <input ref={inputRef} className="jv-inp"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input) } }}
                placeholder={speaking ? 'Speaking…' : processing ? 'Processing…' : 'Speak, sir…'}
                disabled={loading || processing || recording}
                style={{
                  flex: 1, height: 34,
                  background: 'oklch(0.14 0.027 196/0.5)',
                  border: '1px solid oklch(0.82 0.16 196/0.17)',
                  borderRadius: 8, padding: '0 12px',
                  color: 'var(--color-text)', fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  transition: 'border-color 0.15s',
                }}
              />
            )}

            <button onClick={() => sendText(input)}
              disabled={!input.trim() || loading || recording} style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: (input.trim() && !loading && !recording)
                ? 'radial-gradient(circle at 38% 32%, oklch(0.72 0.18 196), oklch(0.3 0.22 196))'
                : 'transparent',
              border: `1px solid ${(input.trim() && !loading && !recording) ? 'oklch(0.82 0.16 196/0.4)' : 'oklch(0.82 0.16 196/0.12)'}`,
              color: 'white', cursor: (input.trim() && !loading && !recording) ? 'pointer' : 'default',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (input.trim() && !loading && !recording) ? 1 : 0.28,
              transition: 'all 0.15s',
            }}>↑</button>
          </div>
        </div>
      )}
    </>
  )
}
