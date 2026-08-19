import { useState, useCallback, Suspense, lazy } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { Layout } from './components/Layout'
import { BootSplash } from './components/BootSplash'
import { AuthScreen } from './components/AuthScreen'
import { WelcomeBack } from './components/WelcomeBack'

// Aurora, reborn: a problem → outcome engine. You tell it what's wrong; it runs
// the loop. The primitive is a Case, and its first capability is Repair.
const Cases     = lazy(() => import('./pages/Cases').then(m => ({ default: m.Cases })))
const CaseView  = lazy(() => import('./pages/CaseView').then(m => ({ default: m.CaseView })))
const Gear      = lazy(() => import('./pages/Gear').then(m => ({ default: m.Gear })))
const Legacy    = lazy(() => import('./pages/Legacy').then(m => ({ default: m.Legacy })))
const Settings  = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border)] border-t-[#00ffc8] animate-spin" />
    </div>
  )
}

function AppInner() {
  const { user, isLoaded, isAuthenticated } = useAuth()
  const [location] = useLocation()
  const [booted, setBooted] = useState(false)
  const handleBootDone = useCallback(() => setBooted(true), [])

  // Social sign-in returns here. Handled before the boot splash and auth gate:
  // the session isn't established yet, so any gate above would bounce mid-handshake.
  if (location === '/sso-callback') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-void)' }}>
        <RouteFallback />
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        />
      </div>
    )
  }

  if (!booted || !isLoaded) return <BootSplash onDone={handleBootDone} />
  if (!isAuthenticated)     return <AuthScreen />
  if (!user)                return <RouteFallback />

  return (
    <>
      <WelcomeBack />
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/"            component={Cases}    />
            <Route path="/case/:id">{(params) => <CaseView id={params.id} />}</Route>
            <Route path="/gear"        component={Gear}     />
            <Route path="/legacy"      component={Legacy}   />
            <Route path="/settings"    component={Settings} />
            <Route>
              <div className="flex items-center justify-center h-full text-[var(--color-muted)] font-display">
                404 · Page not found
              </div>
            </Route>
          </Switch>
        </Suspense>
      </Layout>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AnimatePresence>
          <AppInner />
        </AnimatePresence>
        <Analytics />
      </ToastProvider>
    </AuthProvider>
  )
}
