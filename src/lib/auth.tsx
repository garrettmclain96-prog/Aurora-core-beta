import { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'god' | 'admin' | 'viewer'

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
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isGod: boolean
  isAdmin: boolean
  updateUserRole: (id: string, role: UserRole) => void
  error: string | null
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

// God account — always Garrett
const GOD_EMAIL = 'garrettmclain96@gmail.com'
const GOD_USER: User = {
  id: 'god-001',
  email: GOD_EMAIL,
  name: 'Garrett McLain',
  role: 'god',
  avatar: '⚡',
  joinedAt: '2026-01-01',
}

const STORAGE_KEY = 'aurora_auth'
const USERS_KEY   = 'aurora_users'

function hashPassword(pw: string) {
  // Simple deterministic hash for demo — not for production
  let h = 0
  for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0
  return h.toString(36)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load current user
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setUser(JSON.parse(saved))
    // Load user registry
    const savedUsers = localStorage.getItem(USERS_KEY)
    setUsers(savedUsers ? JSON.parse(savedUsers) : [GOD_USER])
  }, [])

  const saveUsers = (u: User[]) => {
    setUsers(u)
    localStorage.setItem(USERS_KEY, JSON.stringify(u))
  }

  const login = async (email: string, password: string) => {
    setError(null)
    const normalized = email.toLowerCase().trim()

    // God mode
    if (normalized === GOD_EMAIL.toLowerCase()) {
      if (hashPassword(password) !== hashPassword('zachary2026') && password !== 'zachary2026') {
        // Allow any password for god — just find matching stored hash
        const registry: (User & { pwHash?: string })[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
        const godEntry = registry.find(u => u.email.toLowerCase() === normalized)
        if (godEntry && (godEntry as { pwHash?: string }).pwHash && (godEntry as { pwHash?: string }).pwHash !== hashPassword(password)) {
          throw new Error('Invalid password')
        }
      }
      setUser(GOD_USER)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(GOD_USER))
      return
    }

    // Regular users
    const registry: (User & { pwHash?: string })[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const found = registry.find(u => u.email.toLowerCase() === normalized)
    if (!found) throw new Error('No account found. Please sign up.')
    const entry = found as User & { pwHash?: string }
    if (entry.pwHash && entry.pwHash !== hashPassword(password)) throw new Error('Invalid password')

    const { pwHash: _pw, ...cleanUser } = entry
    setUser(cleanUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanUser))
  }

  const signup = async (email: string, password: string, name: string) => {
    setError(null)
    const normalized = email.toLowerCase().trim()
    const registry: (User & { pwHash?: string })[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    if (registry.find(u => u.email.toLowerCase() === normalized)) throw new Error('Account already exists. Please log in.')

    const newUser: User & { pwHash: string } = {
      id: `usr-${Date.now()}`,
      email: normalized,
      name: name.trim(),
      role: 'viewer',
      joinedAt: new Date().toISOString().split('T')[0],
      pwHash: hashPassword(password),
    }
    const updated = [...registry, newUser]
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    const { pwHash: _pw, ...cleanUser } = newUser
    setUser(cleanUser)
    setUsers(updated.map(({ pwHash: _p, ...u }) => u))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const updateUserRole = (id: string, role: UserRole) => {
    const registry: (User & { pwHash?: string })[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const updated = registry.map(u => u.id === id ? { ...u, role } : u)
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    setUsers(updated)
  }

  return (
    <Ctx.Provider value={{
      user, users, login, signup, logout,
      isGod:  user?.role === 'god',
      isAdmin: user?.role === 'god' || user?.role === 'admin',
      updateUserRole, error,
    }}>
      {children}
    </Ctx.Provider>
  )
}
