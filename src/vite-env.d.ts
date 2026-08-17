/// <reference types="vite/client" />

/**
 * The Clerk publishable key, resolved at build time from whichever of
 * VITE_CLERK_PUBLISHABLE_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY /
 * CLERK_PUBLISHABLE_KEY is set. Empty string when none are.
 * See the `define` block in vite.config.ts.
 */
declare const __CLERK_PUBLISHABLE_KEY__: string
