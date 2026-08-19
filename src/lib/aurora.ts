// Client to Aurora's diagnostician brain (/api/aurora).

import type { Case, Equipment } from './cases'

export interface AuroraReply {
  reply: string
  ask?: 'photo' | 'text' | null
  safety?: string | null
  probable_cause?: string | null
  equipment?: { name?: string; make?: string; model?: string; category?: string } | null
  status?: 'diagnosing' | 'resolved'
  error?: string
}

type AuthedFetch = (path: string, init?: RequestInit) => Promise<unknown>

/**
 * Ask Aurora for the next diagnostic move.
 * `userMessage` is the newest thing the user said/observed; `imageDataUrl` is an
 * optional downscaled photo (e.g. the model plate). The case timeline gives context.
 */
export async function askAurora(
  authedFetch: AuthedFetch,
  args: { kase: Case; equipment?: Equipment | null; userMessage?: string; imageDataUrl?: string },
): Promise<AuroraReply> {
  const { kase, equipment, userMessage, imageDataUrl } = args
  try {
    const res = await authedFetch('/api/aurora', {
      method: 'POST',
      body: JSON.stringify({
        problem: kase.problem,
        timeline: kase.timeline.map(e => ({ role: e.role, text: e.text })),
        equipment: equipment
          ? { name: equipment.name, make: equipment.make, model: equipment.model, category: equipment.category, notes: equipment.notes }
          : null,
        userMessage,
        imageDataUrl,
      }),
    })
    return res as AuroraReply
  } catch (e) {
    return { reply: '', error: e instanceof Error ? e.message : 'Aurora is unreachable right now.' }
  }
}
