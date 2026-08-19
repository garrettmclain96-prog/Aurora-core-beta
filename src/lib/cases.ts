// The Case — Aurora's core primitive. A case is one problem, tracked from
// "something's broken" to a probable cause and a fix, with a timeline and the
// equipment it belongs to. Everything persists locally (localStorage for the
// records, IndexedDB for photos via vault.ts).

export type CaseStatus = 'open' | 'diagnosing' | 'resolved'
export type EventRole = 'you' | 'aurora'
export type EventKind = 'message' | 'photo' | 'cause' | 'resolution'

export interface CaseEvent {
  id: string
  role: EventRole
  kind: EventKind
  text: string
  imageId?: string
  safety?: string | null
  ts: number
}

export interface Case {
  id: string
  title: string
  problem: string
  status: CaseStatus
  equipmentId?: string
  probableCause?: string
  timeline: CaseEvent[]
  createdAt: number
  updatedAt: number
}

export interface Equipment {
  id: string
  name: string
  make?: string
  model?: string
  category?: string
  notes?: string
  caseIds: string[]
  createdAt: number
}

const CASES_KEY = 'aurora_cases'
const EQUIP_KEY = 'aurora_equipment'

function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ---- cases ----
export function loadCases(): Case[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CASES_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}
export function saveCases(cases: Case[]): void {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases))
}

export function newCase(problem: string): Case {
  const now = Date.now()
  const title = problem.trim().split('\n')[0].slice(0, 80) || 'Untitled case'
  return {
    id: uid('case'),
    title,
    problem: problem.trim(),
    status: 'open',
    timeline: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function newEvent(role: EventRole, kind: EventKind, text: string, extra: Partial<CaseEvent> = {}): CaseEvent {
  return { id: uid('ev'), role, kind, text, ts: Date.now(), ...extra }
}

export function upsertCase(cases: Case[], c: Case): Case[] {
  c.updatedAt = Date.now()
  const i = cases.findIndex(x => x.id === c.id)
  if (i === -1) return [c, ...cases]
  const next = cases.slice()
  next[i] = c
  return next
}

export function deleteCase(cases: Case[], id: string): Case[] {
  return cases.filter(c => c.id !== id)
}

export function imageIdsIn(c: Case): string[] {
  return c.timeline.map(e => e.imageId).filter((x): x is string => !!x)
}

// ---- equipment (the memory) ----
export function loadEquipment(): Equipment[] {
  try {
    const raw = JSON.parse(localStorage.getItem(EQUIP_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}
export function saveEquipment(list: Equipment[]): void {
  localStorage.setItem(EQUIP_KEY, JSON.stringify(list))
}

export function newEquipment(fields: Partial<Equipment>): Equipment {
  return {
    id: uid('eq'),
    name: fields.name || [fields.make, fields.model].filter(Boolean).join(' ') || 'Equipment',
    make: fields.make,
    model: fields.model,
    category: fields.category,
    notes: fields.notes,
    caseIds: fields.caseIds || [],
    createdAt: Date.now(),
  }
}

// Find equipment that matches a make/model the brain just identified, so we
// don't create a duplicate record for gear Aurora already knows.
export function matchEquipment(list: Equipment[], make?: string, model?: string): Equipment | null {
  if (!make && !model) return null
  const mk = (make || '').toLowerCase().trim()
  const md = (model || '').toLowerCase().trim()
  return list.find(e =>
    (md && (e.model || '').toLowerCase().trim() === md) ||
    (mk && md && (e.make || '').toLowerCase().trim() === mk),
  ) ?? null
}
