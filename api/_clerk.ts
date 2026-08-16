import { createClerkClient, verifyToken, type User } from '@clerk/backend'
import type { IncomingMessage, ServerResponse } from 'http'

export interface VercelRequest extends IncomingMessage {
  body: unknown
  query: Partial<Record<string, string | string[]>>
}
export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
}

// The account that is always granted the top 'god' role, regardless of what
// role is currently stored in Clerk. Matched case-insensitively against the
// verified primary email on the Clerk user record — never trust a
// client-supplied email for this check.
export const GOD_EMAIL = 'garrettmclain96@gmail.com'

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
  if (primaryEmail(user) === GOD_EMAIL) return 'god'
  const stored = user.publicMetadata?.role
  return stored === 'admin' ? 'admin' : 'viewer'
}

/** Verifies the bearer token on the request and returns the authenticated Clerk user, or null. */
export async function requireUser(req: VercelRequest): Promise<User | null> {
  const auth = req.headers.authorization
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
