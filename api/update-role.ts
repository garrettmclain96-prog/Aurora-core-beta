import { clerkClient, requireUser, roleOf, serializeUser, GOD_EMAIL, type VercelRequest, type VercelResponse } from './_clerk'

const ASSIGNABLE_ROLES = ['viewer', 'admin'] as const

// Changes another account's role. God only — admins can view the user list
// but not grant/revoke admin themselves. The god account's own role can
// never be changed here (it's always derived from GOD_EMAIL server-side).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const caller = await requireUser(req)
  if (!caller) return res.status(401).json({ error: 'Unauthorized' })
  if (roleOf(caller) !== 'god') return res.status(403).json({ error: 'Forbidden' })

  const body = (req.body ?? {}) as { userId?: unknown; role?: unknown }
  const { userId, role } = body
  if (typeof userId !== 'string' || typeof role !== 'string') {
    return res.status(400).json({ error: 'userId and role are required' })
  }
  if (!ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
    return res.status(400).json({ error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` })
  }

  const target = await clerkClient().users.getUser(userId).catch(() => null)
  if (!target) return res.status(404).json({ error: 'User not found' })
  if (roleOf(target) === 'god') return res.status(400).json({ error: `Cannot change the ${GOD_EMAIL} account's role` })

  await clerkClient().users.updateUserMetadata(target.id, {
    publicMetadata: { ...target.publicMetadata, role },
  })

  const updated = await clerkClient().users.getUser(target.id)
  return res.status(200).json(serializeUser(updated))
}
