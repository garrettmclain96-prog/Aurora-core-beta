export const config = { runtime: 'nodejs' }

import { clerkClient, requireUser, roleOf, serializeUser, json } from './_clerk'

const ASSIGNABLE_ROLES = ['viewer', 'admin'] as const

// Changes another account's role. God only — admins can view the user list
// but not grant/revoke admin themselves. The god account's own role can
// never be changed here (it's always derived server-side — see roleOf).
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const caller = await requireUser(req)
  if (!caller) return json({ error: 'Unauthorized' }, 401)
  if (roleOf(caller) !== 'god') return json({ error: 'Forbidden' }, 403)

  let body: unknown
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { userId, role } = (body ?? {}) as { userId?: unknown; role?: unknown }
  if (typeof userId !== 'string' || typeof role !== 'string') {
    return json({ error: 'userId and role are required' }, 400)
  }
  if (!ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
    return json({ error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` }, 400)
  }

  const target = await clerkClient().users.getUser(userId).catch(() => null)
  if (!target) return json({ error: 'User not found' }, 404)
  if (roleOf(target) === 'god') return json({ error: "The god account's role cannot be changed" }, 400)

  await clerkClient().users.updateUserMetadata(target.id, {
    publicMetadata: { ...target.publicMetadata, role },
  })

  const updated = await clerkClient().users.getUser(target.id)
  return json(serializeUser(updated))
}
