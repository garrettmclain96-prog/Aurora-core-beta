# Aurora Core v2.0

Seven-layer cognitive-energy ecosystem. AI-powered biometric + energy management platform.

## Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS 4
- Recharts for data visualization
- Wouter for routing
- Clerk for authentication
- Vercel serverless functions (Claude/Groq chat proxy + role management)

## Auth

Sign-in/sign-up is handled by [Clerk](https://clerk.com) (email + password,
with an email verification code step). Roles (`god` / `admin` / `viewer`)
are stored in Clerk's `publicMetadata` and resolved server-side:

- The account whose **verified email** matches `GOD_EMAIL` in `api/_clerk.ts`
  is always granted `god`, automatically, the first time it signs in —
  no manual dashboard step needed.
- Every other account defaults to `viewer` on first sign-in.
- Only `god` can promote/demote accounts between `viewer` and `admin`
  (Settings → Users tab), enforced server-side in `api/update-role.ts`.

See `.env.example` for the required `VITE_CLERK_PUBLISHABLE_KEY` /
`CLERK_SECRET_KEY` — get both from your Clerk Dashboard → API Keys.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in your real Clerk + AI keys
```

Plain `vite` doesn't serve the `/api/*` serverless functions that auth and
chat depend on. Use the Vercel CLI for local dev instead so both the
frontend and the API routes run together:

```bash
npm i -g vercel   # once
vercel dev
```

(`npm run dev` still works for pure frontend iteration, but sign-in/sign-up
and the AI chat won't function without `vercel dev` or a real deployment.)

## Deploy to Vercel

1. Push to GitHub
2. Import project at vercel.com — framework: **Vite**
3. Add environment variables from `.env.example`: `VITE_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY`, and `ANTHROPIC_API_KEY` (or `GROQ_API_KEY` as a free
   fallback)
4. Deploy

Auth requires Clerk to be configured. The AI Chat and Simulation "Analyze
with AI" features require an AI key — everything else runs on demo data
with no external dependencies.

## Architecture

```
L1 Bio Ingestion
L2 Signal Normalization
L3 Cognitive Core (Health · Energy · Behavior · Environment agents)
L4 Predictive Simulation (Monte Carlo + TFT)
L5 Decision Orchestration
L6 Physical Execution (TurnBot Matter/Thread/BLE)
L7 Optimization Loop
```

## Pages
| Route | Page |
|---|---|
| `/` | Dashboard |
| `/layers` | Cognitive Layers |
| `/agents` | Agent Panel |
| `/circuits` | Circuit Monitor |
| `/battery` | Battery Management |
| `/simulation` | Predictive Simulation |
| `/turnbot` | TurnBot Network |
| `/chat` | AI Chat |
| `/alerts` | Alert Center |
