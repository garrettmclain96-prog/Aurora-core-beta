<div align="center">

# AURORA
### Problem → Outcome

**Tell Aurora what's wrong. It figures out the rest.**

A diagnostic engine that turns "something's broken" into a probable cause and a
safe fix — one clear step at a time. Its first capability is **Repair**: home,
RV, and off-grid equipment.

[Live](https://aurora-core-beta.vercel.app)

</div>

---

## What it is

The old Aurora was a dashboard of panels. This one has a single primitive: the
**Case.**

You describe a broken thing. Aurora — running Claude as a safety-first
diagnostician — asks the right questions, reads the model/spec plate from a
photo, builds a differential, walks you through **safe** tests one at a time,
and converges on the probable cause and the fix. Every unit it identifies is
**remembered**, so next time it already knows your gear.

```
  you: "AC runs but the house won't cool"
        │
        ▼
  UNDERSTAND ──▶ INVESTIGATE ──▶ TEST ──▶ VERIFY ──▶ REMEMBER
   (questions)   (photo of the   (one safe  (did it   (equipment
                  plate, reads    step at    work?)    on file)
                  it with vision) a time)
        │
        ▼
   probable cause + fix
```

**Safety is not optional.** For anything with mains voltage, capacitors, gas,
refrigerant, or fuel, Aurora insists on de-energizing, warns about stored
charge, and sets clear "stop and call a licensed pro" thresholds. It won't hand
a novice a dangerous step.

## The three screens

- **Cases** — start a case, see the ones in progress and the ones you've solved.
- **A case** — the diagnostic conversation: your problem, Aurora's questions and
  steps, photos, safety notes, and the probable cause when it lands.
- **Gear** — everything Aurora has learned about your equipment, each unit
  linked to its cases. This is the memory: *"Aurora already knows your AC."*

## How it's built

| Layer | What |
|---|---|
| Frontend | React 19 · Vite · Tailwind v4 · wouter · framer-motion |
| Storage | Local-first — cases/gear in `localStorage`, photos in IndexedDB (`src/lib/vault.ts`). Nothing leaves your device except an image you send to be read. |
| Brain | `api/aurora.ts` — a serverless proxy to Claude, safety-first system prompt, structured JSON out. Requires a signed-in Clerk session; rate-limited per user. |
| Auth | Clerk (headless), with a guest mode. God/admin roles for the owner. |

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev                  # frontend only
# or `vercel dev` to run the /api brain alongside it
```

**Required env** (see `.env.example` for the full list):
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — auth.
- `ANTHROPIC_API_KEY` — Aurora's brain. Without it the app still runs (cases,
  gear, photos), but starting a case reports the brain isn't configured yet.
- `AURORA_MODEL` *(optional)* — the model Aurora reasons with (default
  `claude-opus-5`; set `claude-sonnet-4-6` for a cheaper option).

---

<div align="center">
For Zachary Lee McLain · McLain Systems
</div>
