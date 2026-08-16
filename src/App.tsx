import { useState, Suspense, lazy } from 'react'
import { Route, Switch } from 'wouter'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { Layout } from './components/Layout'
import { BootSplash } from './components/BootSplash'
import { AuthScreen } from './components/AuthScreen'

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

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border)] border-t-[#00ffc8] animate-spin" />
    </div>
  )
}

function AppInner() {
  const { user } = useAuth()
  const [booted, setBooted] = useState(false)

  if (!booted) return <BootSplash onDone={() => setBooted(true)} />
  if (!user)   return <AuthScreen />

  return (
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
          <Route path="/manifesto"    component={Manifesto}       />
          <Route path="/legacy"       component={Legacy}          />
          <Route path="/settings"     component={Settings}        />
          <Route>
            <div className="flex items-center justify-center h-full text-[var(--color-muted)] font-display">
              404 · Page not found
            </div>
          </Route>
        </Switch>
      </Suspense>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AnimatePresence>
          <AppInner />
        </AnimatePresence>
      </ToastProvider>
    </AuthProvider>
  )
}
