import { createClerkClient, verifyToken, type User } from '@clerk/backend'

// The account that is always granted the top 'god' role, regardless of what
// role is currently stored in Clerk. Both checks read the server-side Clerk
// user record — never a client-supplied value.
//
// GOD_USER_ID is the more reliable of the two: a Clerk user id is immutable,
// so it keeps working if the account's email changes, and it sidesteps the
// chicken-and-egg problem where signing up under an unexpected address leaves
// you a viewer with nobody able to promote you (only a god can grant roles).
// GOD_EMAIL is kept as the fallback so existing deployments are unaffected.
export const GOD_USER_ID = process.env.GOD_USER_ID ?? ''
export const GOD_EMAIL = (process.env.GOD_EMAIL ?? 'garrettmclain96@gmail.com').toLowerCase()

export type UserRole = 'god' | 'admin' | 'viewer'

function secretKey(): string {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) throw new Error('CLERK_SECRET_KEY is not set')
  return key
}

let _client: ReturnType<typeof createClerkClient> | null = null
export function clerkClient() {
  if (!_client) _client = createClerkClient({ secretKey: secretKey() })
  return _client
}

export function primaryEmail(user: User): string | null {
  const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
  return email?.emailAddress?.toLowerCase() ?? null
}

export function roleOf(user: User): UserRole {
  if (GOD_USER_ID && user.id === GOD_USER_ID) return 'god'
  if (primaryEmail(user) === GOD_EMAIL) return 'god'
  const stored = user.publicMetadata?.role
  return stored === 'admin' ? 'admin' : 'viewer'
}

/** Verifies the bearer token on a Web-standard Request and returns the authenticated Clerk user, or null. */
export async function requireUser(req: Request): Promise<User | null> {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey: secretKey() })
    if (!payload.sub) return null
    return await clerkClient().users.getUser(payload.sub)
  } catch {
    return null
  }
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: primaryEmail(user) ?? '',
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unnamed',
    role: roleOf(user),
    avatar: roleOf(user) === 'god' ? '⚡' : undefined,
    joinedAt: new Date(user.createdAt).toISOString().split('T')[0],
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
