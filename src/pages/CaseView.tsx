import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, Link } from 'wouter'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Camera, Send, ShieldAlert, CheckCircle2, Trash2, Cpu, Wrench, ImageIcon,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  loadCases, saveCases, upsertCase, deleteCase, newEvent, imageIdsIn,
  loadEquipment, saveEquipment, newEquipment, matchEquipment,
  type Case, type CaseEvent, type Equipment,
} from '../lib/cases'
import { askAurora } from '../lib/aurora'
import {
  newImageId, putImage, cacheUrlFor, ensureUrl, deleteImages, downscaleToDataUrl,
} from '../lib/vault'

export function CaseView({ id }: { id: string }) {
  const [, setLocation] = useLocation()
  const { authedFetch } = useAuth()
  const [cases, setCases] = useState<Case[]>(loadCases)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const kase = cases.find(c => c.id === id) ?? null

  const persist = useCallback((updated: Case) => {
    setCases(prev => {
      const next = upsertCase(prev, updated)
      saveCases(next)
      return next
    })
  }, [])

  // Aurora opens the case herself on first view (asks the first real question).
  const firstMoveDone = useRef(false)
  useEffect(() => {
    if (!kase || firstMoveDone.current) return
    if (kase.timeline.length === 0) {
      firstMoveDone.current = true
      void runAurora(kase, undefined, undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kase?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [kase?.timeline.length, sending])

  async function runAurora(current: Case, userMessage: string | undefined, imageDataUrl: string | undefined) {
    setSending(true)
    const equipment = current.equipmentId
      ? loadEquipment().find(e => e.id === current.equipmentId) ?? null
      : null
    const reply = await askAurora(authedFetch, { kase: current, equipment, userMessage, imageDataUrl })
    setSending(false)

    if (reply.error) {
      const ev = newEvent('aurora', 'message', `⚠ ${reply.error}`)
      persist({ ...current, timeline: [...current.timeline, ev] })
      return
    }

    let updated: Case = { ...current }
    const events: CaseEvent[] = []
    events.push(newEvent('aurora', 'message', reply.reply, { safety: reply.safety ?? null }))

    if (reply.probable_cause) {
      updated.probableCause = reply.probable_cause
      events.push(newEvent('aurora', 'cause', reply.probable_cause))
    }
    if (reply.status === 'resolved') updated.status = 'resolved'
    else if (updated.status === 'open') updated.status = 'diagnosing'

    // Memory: link or create equipment when Aurora identifies the gear.
    if (reply.equipment && (reply.equipment.make || reply.equipment.model || reply.equipment.name) && !updated.equipmentId) {
      const list = loadEquipment()
      const match = matchEquipment(list, reply.equipment.make, reply.equipment.model)
      if (match) {
        updated.equipmentId = match.id
        if (!match.caseIds.includes(updated.id)) {
          match.caseIds = [...match.caseIds, updated.id]
          saveEquipment(list)
        }
      } else {
        const eq = newEquipment({ ...reply.equipment, caseIds: [updated.id] })
        updated.equipmentId = eq.id
        saveEquipment([eq, ...list])
      }
    }

    updated = { ...updated, timeline: [...updated.timeline, ...events] }
    persist(updated)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !kase || sending) return
    setInput('')
    const ev = newEvent('you', 'message', text)
    const updated = { ...kase, timeline: [...kase.timeline, ev] }
    persist(updated)
    await runAurora(updated, text, undefined)
  }

  const onPhoto = async (file: File) => {
    if (!kase || sending) return
    const imgId = newImageId()
    await putImage(imgId, file)
    cacheUrlFor(imgId, file)
    const ev = newEvent('you', 'photo', file.name || 'photo', { imageId: imgId })
    const updated = { ...kase, timeline: [...kase.timeline, ev] }
    persist(updated)
    const dataUrl = await downscaleToDataUrl(file)
    await runAurora(updated, 'Here is a photo — read what you can from it.', dataUrl)
  }

  const resolve = () => {
    if (!kase) return
    persist({ ...kase, status: kase.status === 'resolved' ? 'diagnosing' : 'resolved' })
  }

  const remove = async () => {
    if (!kase) return
    if (!confirm('Delete this case? This cannot be undone.')) return
    await deleteImages(imageIdsIn(kase))
    const next = deleteCase(cases, kase.id)
    saveCases(next)
    setLocation('/')
  }

  if (!kase) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-[var(--color-muted)] font-display text-sm">Case not found.</p>
        <Link href="/" className="text-[var(--color-cyan)] text-xs font-display">← Back to cases</Link>
      </div>
    )
  }

  const resolved = kase.status === 'resolved'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-xl">
        <Link href="/" className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-display font-bold text-[var(--color-text)] truncate">{kase.title}</div>
          <div className="text-[10px] text-[var(--color-muted)] flex items-center gap-1.5">
            <span className="uppercase tracking-wide" style={{ color: resolved ? 'var(--color-green)' : 'var(--color-gold)' }}>
              {resolved ? 'Resolved' : 'Diagnosing'}
            </span>
            {kase.equipmentId && <EquipmentTag id={kase.equipmentId} />}
          </div>
        </div>
        <button onClick={resolve} title={resolved ? 'Reopen' : 'Mark resolved'}
          className={`p-1.5 rounded-lg transition-colors ${resolved ? 'text-[var(--color-green)]' : 'text-[var(--color-muted)] hover:text-[var(--color-green)]'}`}>
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <button onClick={remove} title="Delete case"
          className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-red)] transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* The reported problem */}
          <div className="card p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wrench className="w-3 h-3 text-[var(--color-muted)]" />
              <span className="text-[9px] font-display font-bold tracking-[0.14em] uppercase text-[var(--color-muted)]">The problem</span>
            </div>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{kase.problem}</p>
          </div>

          {kase.timeline.map(ev => <EventBubble key={ev.id} ev={ev} />)}

          {sending && (
            <div className="flex items-center gap-2 text-[var(--color-muted)] pl-1">
              <Cpu className="w-4 h-4 text-[var(--color-cyan)] animate-pulse" />
              <span className="text-xs font-display">Aurora is thinking…</span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      {!resolved && (
        <div className="px-4 md:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} disabled={sending} title="Add a photo"
              className="p-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-cyan)] hover:border-[var(--color-borderhi)] transition-colors disabled:opacity-40">
              <Camera className="w-4 h-4" />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="What did you find? Answer Aurora, or add an observation…"
              rows={1}
              className="flex-1 resize-none bg-[var(--color-void)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] max-h-32"
            />
            <button onClick={send} disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-[oklch(0.82_0.16_196_/_0.14)] border border-[oklch(0.82_0.16_196_/_0.4)] text-[var(--color-cyan)] disabled:opacity-40 transition-all active:scale-95">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EventBubble({ ev }: { ev: CaseEvent }) {
  const mine = ev.role === 'you'
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!mine && (
          <div className="flex items-center gap-1.5 pl-1">
            <Cpu className="w-3 h-3 text-[var(--color-cyan)]" />
            <span className="text-[9px] font-display font-bold tracking-wide uppercase text-[var(--color-cyan)]">Aurora</span>
          </div>
        )}
        {ev.kind === 'photo' && ev.imageId
          ? <Thumb id={ev.imageId} />
          : (
            <div className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              mine
                ? 'bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text)]'
                : ev.kind === 'cause'
                  ? 'bg-[oklch(0.85_0.18_150_/_0.10)] border border-[oklch(0.85_0.18_150_/_0.35)] text-[var(--color-green)]'
                  : 'card text-[var(--color-text)]'
            }`}>
              {ev.kind === 'cause' && (
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-display font-bold tracking-wide uppercase text-[var(--color-green)]">
                  <CheckCircle2 className="w-3 h-3" /> Probable cause
                </div>
              )}
              {ev.text}
            </div>
          )}
        {ev.safety && (
          <div className="flex items-start gap-1.5 rounded-lg px-3 py-2 bg-[oklch(0.75_0.18_35_/_0.10)] border border-[oklch(0.75_0.18_35_/_0.4)] text-[var(--color-ember)] max-w-full">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] leading-snug">{ev.safety}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Thumb({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let ok = true; ensureUrl(id).then(u => { if (ok) setUrl(u) }); return () => { ok = false } }, [id])
  if (!url) return (
    <div className="w-40 h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] flex items-center justify-center">
      <ImageIcon className="w-6 h-6 text-[var(--color-dim)]" />
    </div>
  )
  return <img src={url} alt="attachment" className="max-w-[220px] rounded-xl border border-[var(--color-border)]" />
}

function EquipmentTag({ id }: { id: string }) {
  const eq = loadEquipment().find((e: Equipment) => e.id === id)
  if (!eq) return null
  return <span className="text-[var(--color-muted)]">· {eq.name}</span>
}
