/**
 * useJarvisMemory — Persistent JARVIS memory across sessions
 * Stores conversation history, learned facts, and user preferences in localStorage.
 * Injects context into every chat.ts request so JARVIS remembers you.
 */

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY  = 'jarvis_memory_v2'
const HISTORY_KEY  = 'jarvis_history_v2'
const MAX_HISTORY  = 24   // messages kept across sessions
const MAX_FACTS    = 12   // learned facts

export interface MemoryFact {
  key: string
  value: string
  learnedAt: string
}

export interface JarvisMemory {
  facts: MemoryFact[]
  preferences: Record<string, string>
  sessionCount: number
  lastSeen: string
  userName: string
}

const DEFAULT_MEMORY: JarvisMemory = {
  facts: [],
  preferences: {},
  sessionCount: 0,
  lastSeen: '',
  userName: 'Garrett',
}

function loadMemory(): JarvisMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_MEMORY, ...JSON.parse(raw) } : DEFAULT_MEMORY
  } catch { return DEFAULT_MEMORY }
}

function saveMemory(m: JarvisMemory) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

function loadHistory(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(h: StoredMessage[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_HISTORY))) } catch {}
}

/** Extract learnable facts from JARVIS responses */
function extractFacts(response: string, memory: JarvisMemory): JarvisMemory {
  const updated = { ...memory, facts: [...memory.facts] }

  // Look for patterns JARVIS confirms: preferences, schedules, observations
  const patterns: { rx: RegExp; key: string }[] = [
    { rx: /charging (?:schedule|to|at) ([\w\s:%-]+)/i,      key: 'charge_schedule' },
    { rx: /peak pricing.*?(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?.*?\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i, key: 'peak_window' },
    { rx: /prefer(?:red|s|ence)?.*?([\w\s]+mode)/i,          key: 'preferred_mode' },
    { rx: /CO[₂2].*?(\d{3,4})\s*ppm.*?comfort/i,             key: 'co2_preference' },
    { rx: /optimal.*?temperature.*?(\d{2,3}°?F?)/i,          key: 'temp_preference' },
  ]

  for (const { rx, key } of patterns) {
    const m = response.match(rx)
    if (m?.[1]) {
      const existing = updated.facts.findIndex(f => f.key === key)
      const fact: MemoryFact = { key, value: m[1].trim(), learnedAt: new Date().toISOString() }
      if (existing >= 0) updated.facts[existing] = fact
      else updated.facts = [fact, ...updated.facts].slice(0, MAX_FACTS)
    }
  }

  return updated
}

export function useJarvisMemory() {
  const [memory, setMemory] = useState<JarvisMemory>(() => {
    const m = loadMemory()
    // Increment session count on load
    const updated = { ...m, sessionCount: m.sessionCount + 1, lastSeen: new Date().toISOString() }
    saveMemory(updated)
    return updated
  })

  const [persistedHistory, setPersistedHistory] = useState<StoredMessage[]>(() => loadHistory())

  // Persist history changes
  useEffect(() => { saveHistory(persistedHistory) }, [persistedHistory])

  /** Add messages to persistent history */
  const appendHistory = useCallback((msgs: { role: 'user' | 'assistant'; content: string }[]) => {
    setPersistedHistory(prev => {
      const next = [
        ...prev,
        ...msgs.map(m => ({ ...m, ts: new Date().toISOString() })),
      ].slice(-MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [])

  /** After JARVIS responds, learn from it */
  const learnFromResponse = useCallback((response: string) => {
    setMemory(prev => {
      const updated = extractFacts(response, prev)
      saveMemory(updated)
      return updated
    })
  }, [])

  /** Build the memory context string to inject into system prompt */
  const buildMemoryContext = useCallback((): string => {
    const parts: string[] = []

    if (memory.sessionCount > 1) {
      parts.push(`USER CONTEXT: ${memory.userName}, session #${memory.sessionCount}. Last interaction: ${
        memory.lastSeen ? new Date(memory.lastSeen).toLocaleDateString() : 'first time'
      }.`)
    }

    if (memory.facts.length > 0) {
      parts.push(`REMEMBERED FACTS:\n${memory.facts.map(f => `- ${f.key}: ${f.value}`).join('\n')}`)
    }

    if (Object.keys(memory.preferences).length > 0) {
      parts.push(`USER PREFERENCES:\n${Object.entries(memory.preferences).map(([k,v]) => `- ${k}: ${v}`).join('\n')}`)
    }

    if (persistedHistory.length > 0) {
      const recent = persistedHistory.slice(-6)
      parts.push(`RECENT CONVERSATION CONTEXT:\n${recent.map(m => `${m.role.toUpperCase()}: ${m.content.slice(0,120)}`).join('\n')}`)
    }

    return parts.join('\n\n')
  }, [memory, persistedHistory])

  /** Manually store a preference */
  const setPreference = useCallback((key: string, value: string) => {
    setMemory(prev => {
      const updated = { ...prev, preferences: { ...prev.preferences, [key]: value } }
      saveMemory(updated)
      return updated
    })
  }, [])

  const clearMemory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HISTORY_KEY)
    setMemory(DEFAULT_MEMORY)
    setPersistedHistory([])
  }, [])

  return {
    memory,
    persistedHistory,
    appendHistory,
    learnFromResponse,
    buildMemoryContext,
    setPreference,
    clearMemory,
  }
}
