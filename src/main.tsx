import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App'

// Resolved at build time from any of the three names Clerk's key is
// distributed under — see the `define` block in vite.config.ts.
const CLERK_PUBLISHABLE_KEY = __CLERK_PUBLISHABLE_KEY__

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Clerk publishable key — set CLERK_PUBLISHABLE_KEY (or VITE_/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) in .env.local (dev) or your Vercel project env vars (production), then rebuild. See .env.example.',
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
)
