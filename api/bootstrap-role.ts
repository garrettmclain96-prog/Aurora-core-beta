export const config = { runtime: 'nodejs' }

import { clerkClient, requireUser, roleOf, serializeUser, json } from './_clerk.js'

// Called once after a successful sign-in/sign-up. Ensures the caller has a
// role in Clerk publicMetadata: the configured god account always resolves to
// 'god' (see roleOf in _clerk.ts), everyone else defaults to 'viewer' the
// first time they're seen. Never lets a caller pick their own role.
async function handler(req: Request): Promise<Response> {
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

// Vercel dispatches Web Request/Response through named HTTP-method exports; a
// default export is treated as the Node (req, res) signature and its return
// value is discarded, leaving the request to hang.
export const POST = handler
