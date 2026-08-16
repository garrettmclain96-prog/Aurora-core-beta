import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function AuthScreen() {
  const { login, signup } = useAuth()
  const [mode, setMode]     = useState<'login' | 'signup'>('login')
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [name, setName]     = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const submit = async () => {
    setError('')
    if (!email || !pw) { setError('Email and password required'); return }
    if (mode === 'signup' && !name) { setError('Name required'); return }
    setLoading(true)
    try {
      mode === 'login' ? await login(email, pw) : await signup(email, pw, name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, type = 'text', extra?: React.ReactNode) => (
    <div>
      <label className="mono text-[9px] text-[var(--color-muted)] tracking-[0.2em] uppercase block mb-1.5">{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full bg-[var(--color-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] outline-none transition-all"
          placeholder={type === 'email' ? 'you@example.com' : type === 'password' ? '••••••••' : 'Your name'} />
        {extra}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'var(--color-void)' }}>
      <div className="aurora-orb-1" />
      <div className="aurora-orb-2" />
      <div className="aurora-orb-3" />
      <div className="grid-overlay absolute inset-0" />

      {/* Left panel - desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative z-10 p-12 border-r border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-[#00ffc840] bg-[#00ffc808] flex items-center justify-center">
            <span className="display font-black text-sm gradient-text-aurora">AC</span>
          </div>
          <div>
            <div className="display font-black text-sm text-[#00ffc8] text-glow-teal tracking-wider">AURORA CORE</div>
            <div className="mono text-[8px] text-[var(--color-dim)] tracking-[0.2em]">v2.0 · McLain Systems</div>
          </div>
        </div>

        <div>
          <div className="display font-black text-5xl text-[var(--color-text)] leading-[1.1] mb-6">
            The bridge<br/>to what<br/><span className="gradient-text-aurora">comes next.</span>
          </div>
          <p className="text-[var(--color-muted)] text-sm leading-relaxed max-w-sm">
            Seven cognitive layers. Four AI agents. One system built on an iPhone in Jamaica Beach, Texas. For a son born April 13, 2026.
          </p>
          <div className="flex gap-6 mt-8">
            {[['7', 'Layers'],['4', 'Agents'],['32', 'TurnBot nodes']].map(([v,l]) => (
              <div key={l}>
                <div className="display font-black text-2xl text-[#00ffc8] text-glow-teal">{v}</div>
                <div className="mono text-[9px] text-[var(--color-muted)] uppercase tracking-wider">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mono text-[9px] text-[var(--color-dim)] tracking-[0.2em] uppercase">
          Jonas Lee · Darrell Lee · Garrett Lee · Zachary Lee
        </div>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl border border-[#00ffc840] bg-[#00ffc808] flex items-center justify-center glow-teal">
              <span className="display font-black gradient-text-aurora">AC</span>
            </div>
            <div>
              <div className="display font-black text-lg gradient-text-aurora tracking-wide">AURORA CORE</div>
              <div className="mono text-[9px] text-[var(--color-muted)] tracking-widest">Cognitive-Energy Ecosystem</div>
            </div>
          </div>

          <div className="display font-black text-2xl text-[var(--color-text)] mb-1">
            {mode === 'login' ? 'Welcome back' : 'Join Aurora Core'}
          </div>
          <p className="text-[var(--color-muted)] text-sm mb-6">
            {mode === 'login' ? 'Sign in to your command center' : 'Create your account to get started'}
          </p>

          <div className="card p-6 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {mode === 'signup' && field('Full name', name, setName)}
                {field('Email address', email, setEmail, 'email')}
                {field('Password', pw, setPw, showPw ? 'text' : 'password',
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mono text-[10px] text-[#ff3366] bg-[#ff336610] border border-[#ff336630] rounded-lg px-3 py-2">
                {error}
              </motion.div>
            )}

            <motion.button onClick={submit} disabled={loading} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl display font-bold text-sm transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00ffc8, #00c89b)', color: '#020508' }}>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
            </motion.button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-[var(--color-muted)]">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-xs text-[#00ffc8] hover:text-[#7df9ff] transition-colors display font-bold">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          <p className="text-center mono text-[8px] text-[var(--color-dim)] mt-4 tracking-widest uppercase">
            Built for Zachary Lee McLain · April 13, 2026 💙
          </p>
        </motion.div>
      </div>
    </div>
  )
}
