import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Clerk's dashboard hands out its publishable key under the Next.js name
  // (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), which is the form most people copy.
  // Exposing that prefix too means either name works instead of hard-failing
  // at boot. Only these prefixes reach the client bundle — unprefixed secrets
  // like CLERK_SECRET_KEY stay server-side.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
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
})
