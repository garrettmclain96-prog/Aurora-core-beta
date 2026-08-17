import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useSignIn,
  useSignUp,
} from '@clerk/clerk-react'

export type UserRole = 'god' | 'admin' | 'viewer' | 'guest'

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  joinedAt: string
}

type AuthCtx = {
  user: User | null
  users: User[]
  isLoaded: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  verifyEmail: (code: string) => Promise<void>
  resendVerification: () => Promise<void>
  pendingVerification: boolean
  loginAsGuest: () => void
  logout: () => void
  isGod: boolean
  isAdmin: boolean
  updateUserRole: (id: string, role: UserRole) => Promise<void>
  refreshUsers: () => Promise<void>
  /** Fetch helper that attaches the current Clerk session token. Throws on non-2xx. */
  authedFetch: (path: string, init?: RequestInit) => Promise<unknown>
  error: string | null
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

function extractError(e: unknown): string {
  const err = e as { errors?: { message?: string }[]; message?: string }
  return err?.errors?.[0]?.message ?? err?.message ?? 'Something went wrong'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken, signOut } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()

  const [resolvedUser, setResolvedUser] = useState<User | null>(null)
  const [guestUser, setGuestUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bootstrappedFor = useRef<string | null>(null)

  const user = guestUser ?? resolvedUser
  const isAuthenticated = !!isSignedIn || !!guestUser

  const authedFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken()
    const res = await fetch(path, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json()
  }, [getToken])

  // Resolve (and if needed, bootstrap) this session's role exactly once per sign-in.
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !clerkUser) {
      setResolvedUser(null)
      bootstrappedFor.current = null
      return
    }
    if (bootstrappedFor.current === clerkUser.id) return
    bootstrappedFor.current = clerkUser.id
    authedFetch('/api/bootstrap-role', { method: 'POST' })
      .then((u) => setResolvedUser(u as User))
      .catch(e => setError(extractError(e)))
  }, [clerkLoaded, isSignedIn, clerkUser, authedFetch])

  const refreshUsers = useCallback(async () => {
    try {
      const list = await authedFetch('/api/users')
      setUsers(list as User[])
    } catch (e) {
      setError(extractError(e))
    }
  }, [authedFetch])

  useEffect(() => {
    if (resolvedUser && (resolvedUser.role === 'god' || resolvedUser.role === 'admin')) refreshUsers()
  }, [resolvedUser, refreshUsers])

  const login = async (email: string, password: string) => {
    setError(null)
    if (!signIn) throw new Error('Auth not ready — try again in a moment')
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
      } else {
        throw new Error('Additional verification required for this account')
      }
    } catch (e) {
      const msg = extractError(e)
      setError(msg)
      throw new Error(msg)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    setError(null)
    if (!signUp) throw new Error('Auth not ready — try again in a moment')
    try {
      const [firstName, ...rest] = name.trim().split(' ')
      await signUp.create({ emailAddress: email, password, firstName, lastName: rest.join(' ') || undefined })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (e) {
      const msg = extractError(e)
      setError(msg)
      throw new Error(msg)
    }
  }

  const verifyEmail = async (code: string) => {
    setError(null)
    if (!signUp) throw new Error('Auth not ready — try again in a moment')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        setPendingVerification(false)
      } else {
        throw new Error('Invalid or expired code')
      }
    } catch (e) {
      const msg = extractError(e)
      setError(msg)
      throw new Error(msg)
    }
  }

  const resendVerification = async () => {
    setError(null)
    if (!signUp) throw new Error('Auth not ready — try again in a moment')
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
    } catch (e) {
      const msg = extractError(e)
      setError(msg)
      throw new Error(msg)
    }
  }

  const loginAsGuest = () => {
    setError(null)
    setGuestUser({
      id: 'guest-' + Date.now(),
      email: 'guest@aurora.core',
      name: 'Guest',
      role: 'guest',
      avatar: '👁',
      joinedAt: new Date().toISOString().split('T')[0],
    })
  }

  const logout = () => {
    setGuestUser(null)
    setResolvedUser(null)
    setUsers([])
    bootstrappedFor.current = null
    if (isSignedIn) void signOut()
  }

  const updateUserRole = async (id: string, role: UserRole) => {
    try {
      const updated = await authedFetch('/api/update-role', {
        method: 'POST',
        body: JSON.stringify({ userId: id, role }),
      }) as User
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } catch (e) {
      setError(extractError(e))
    }
  }

  return (
    <Ctx.Provider value={{
      user, users, isLoaded: clerkLoaded, isAuthenticated,
      login, signup, verifyEmail, resendVerification, pendingVerification,
      loginAsGuest, logout,
      isGod: user?.role === 'god',
      isAdmin: user?.role === 'god' || user?.role === 'admin',
      updateUserRole, refreshUsers, authedFetch, error,
    }}>
      {children}
    </Ctx.Provider>
  )
}
