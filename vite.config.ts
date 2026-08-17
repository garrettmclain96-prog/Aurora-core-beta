import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The Clerk publishable key travels under three different names depending on
// where it was copied from: VITE_* (this project's native convention),
// NEXT_PUBLIC_* (what Clerk's dashboard displays, since it defaults to
// Next.js), and a bare CLERK_PUBLISHABLE_KEY (Clerk's framework-agnostic
// docs and CLI). All three are accepted so a correct key is never rejected
// over naming alone.
//
// This is resolved here and injected as a single define rather than by
// widening envPrefix. Adding 'CLERK_' as a prefix would also inline
// CLERK_SECRET_KEY into the public browser bundle — resolving exactly one
// named variable keeps the secret server-side by construction.
const PK_NAMES = [
  'VITE_CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_PUBLISHABLE_KEY',
] as const

export default defineConfig(({ mode }) => {
  // '' prefix so unprefixed names are visible here; nothing from this object
  // reaches the client except the one value defined below.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const publishableKey =
    PK_NAMES.map(n => fileEnv[n] || process.env[n]).find(v => v && v.trim()) ?? ''

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __CLERK_PUBLISHABLE_KEY__: JSON.stringify(publishableKey),
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'charts':       ['recharts'],
            'router':       ['wouter'],
            'icons':        ['lucide-react'],
            'motion':       ['framer-motion'],
          },
        },
      },
    },
  }
})
