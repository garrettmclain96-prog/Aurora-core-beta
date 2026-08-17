export const config = { runtime: 'nodejs' }

import { clerkClient, requireUser, roleOf, serializeUser, json } from './_clerk'

// Lists all accounts for the admin panel. God/admin only.
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const caller = await requireUser(req)
  if (!caller) return json({ error: 'Unauthorized' }, 401)
  const callerRole = roleOf(caller)
  if (callerRole !== 'god' && callerRole !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { data } = await clerkClient().users.getUserList({ limit: 100 })
  return json(data.map(serializeUser))
}
