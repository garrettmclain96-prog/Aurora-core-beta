# Aurora Core v2.0

Seven-layer cognitive-energy ecosystem. AI-powered biometric + energy management platform.

## Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS 4
- Recharts for data visualization
- Wouter for routing
- Vercel serverless function for Claude API proxy

## Local dev

```bash
npm install
# Create a .env.local file:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

## Deploy to Vercel

1. Push to GitHub (your repo: T3a165/Aurora-Core)
2. Import project at vercel.com — framework: **Vite**
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy

The AI Chat and Simulation AI analysis features require the API key.
Everything else runs on demo data with no external dependencies.

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
