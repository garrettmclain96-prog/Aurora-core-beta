import { clerkClient, requireUser, roleOf, serializeUser, type VercelRequest, type VercelResponse } from './_clerk'

// Lists all accounts for the admin panel. God/admin only.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const caller = await requireUser(req)
  if (!caller) return res.status(401).json({ error: 'Unauthorized' })
  const callerRole = roleOf(caller)
  if (callerRole !== 'god' && callerRole !== 'admin') return res.status(403).json({ error: 'Forbidden' })

  const { data } = await clerkClient().users.getUserList({ limit: 100 })
  return res.status(200).json(data.map(serializeUser))
}
