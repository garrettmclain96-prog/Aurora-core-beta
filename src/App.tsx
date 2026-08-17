import { useState, useCallback, Suspense, lazy } from 'react'
import { Route, Switch } from 'wouter'
import { AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { RealtimeProvider } from './hooks/useRealtime'
import { Layout } from './components/Layout'
import { BootSplash } from './components/BootSplash'
import { AuthScreen } from './components/AuthScreen'
import { WelcomeBack } from './components/WelcomeBack'

const Dashboard       = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const CognitiveLayers = lazy(() => import('./pages/CognitiveLayers').then(m => ({ default: m.CognitiveLayers })))
const AgentPanel      = lazy(() => import('./pages/AgentPanel').then(m => ({ default: m.AgentPanel })))
const CircuitMonitor  = lazy(() => import('./pages/CircuitMonitor').then(m => ({ default: m.CircuitMonitor })))
const BatteryPanel    = lazy(() => import('./pages/BatteryPanel').then(m => ({ default: m.BatteryPanel })))
const Simulation      = lazy(() => import('./pages/Simulation').then(m => ({ default: m.Simulation })))
const TurnBotPanel    = lazy(() => import('./pages/TurnBotPanel').then(m => ({ default: m.TurnBotPanel })))
const AIChat          = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })))
const Alerts          = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })))
const Integrations    = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })))
const Manifesto       = lazy(() => import('./pages/Manifesto').then(m => ({ default: m.Manifesto })))
const Legacy           = lazy(() => import('./pages/Legacy').then(m => ({ default: m.Legacy })))
const Settings         = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const ArchangelPanel   = lazy(() => import('./pages/ArchangelPanel').then(m => ({ default: m.ArchangelPanel })))
const PillarsPanel     = lazy(() => import('./pages/PillarsPanel').then(m => ({ default: m.PillarsPanel })))
const DevPortal        = lazy(() => import('./pages/DevPortal').then(m => ({ default: m.DevPortal })))
const SovereignEngine  = lazy(() => import('./components/SovereignEngine'))
const JarvisPanel      = lazy(() => import('./pages/JarvisPanel').then(m => ({ default: m.JarvisPanel })))
const JarvisOrb        = lazy(() => import('./components/JarvisOrb'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border)] border-t-[#00ffc8] animate-spin" />
    </div>
  )
}

function AppInner() {
  const { user, isLoaded, isAuthenticated } = useAuth()
  const [booted, setBooted] = useState(false)
  const handleBootDone = useCallback(() => setBooted(true), [])

  if (!booted || !isLoaded) return <BootSplash onDone={handleBootDone} />
  if (!isAuthenticated)     return <AuthScreen />
  if (!user)                return <RouteFallback />

  return (
    <RealtimeProvider>
      <WelcomeBack />
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/"             component={Dashboard}       />
            <Route path="/layers"       component={CognitiveLayers} />
            <Route path="/agents"       component={AgentPanel}      />
            <Route path="/circuits"     component={CircuitMonitor}  />
            <Route path="/battery"      component={BatteryPanel}    />
            <Route path="/simulation"   component={Simulation}      />
            <Route path="/turnbot"      component={TurnBotPanel}    />
            <Route path="/chat"         component={AIChat}          />
            <Route path="/alerts"       component={Alerts}          />
            <Route path="/integrations" component={Integrations}    />
            <Route path="/dev"          component={DevPortal}       />
            <Route path="/archangel"    component={ArchangelPanel}  />
            <Route path="/pillars"      component={PillarsPanel}    />
            <Route path="/sovereign"    component={SovereignEngine} />
            <Route path="/jarvis"       component={JarvisPanel}     />
            <Route path="/manifesto"    component={Manifesto}       />
            <Route path="/legacy"       component={Legacy}          />
            <Route path="/settings"     component={Settings}        />
            <Route>
              <div className="flex items-center justify-center h-full text-[var(--color-muted)] font-display">
                404 · Page not found
              </div>
            </Route>
          </Switch>
          <JarvisOrb />
        </Suspense>
      </Layout>
    </RealtimeProvider>
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
