import { clerkClient, requireUser, roleOf, serializeUser, type VercelRequest, type VercelResponse } from './_clerk'

// Called once after a successful sign-in/sign-up. Ensures the caller has a
// role in Clerk publicMetadata: the hardcoded GOD_EMAIL always resolves to
// 'god' (see roleOf in _clerk.ts), everyone else defaults to 'viewer' the
// first time they're seen. Never lets a caller pick their own role.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const resolvedRole = roleOf(user)
  const storedRole = user.publicMetadata?.role

  if (resolvedRole !== storedRole) {
    await clerkClient().users.updateUserMetadata(user.id, {
      publicMetadata: { ...user.publicMetadata, role: resolvedRole },
    })
  }

  return res.status(200).json(serializeUser(user))
}
