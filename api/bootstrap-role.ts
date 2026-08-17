export const config = { runtime: 'nodejs' }

import { clerkClient, requireUser, roleOf, serializeUser, json } from './_clerk'

// Called once after a successful sign-in/sign-up. Ensures the caller has a
// role in Clerk publicMetadata: the hardcoded GOD_EMAIL always resolves to
// 'god' (see roleOf in _clerk.ts), everyone else defaults to 'viewer' the
// first time they're seen. Never lets a caller pick their own role.
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const user = await requireUser(req)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const resolvedRole = roleOf(user)
  const storedRole = user.publicMetadata?.role

  if (resolvedRole !== storedRole) {
    await clerkClient().users.updateUserMetadata(user.id, {
      publicMetadata: { ...user.publicMetadata, role: resolvedRole },
    })
  }

  return json(serializeUser(user))
}
