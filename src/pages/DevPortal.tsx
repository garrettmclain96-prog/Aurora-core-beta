import React from 'react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '../components/PageTransition'
import {
  Code2, Terminal, Zap, Globe, Webhook, BookOpen,
  ChevronRight, Check, Copy, Play, Radio, Key,
  ArrowRight, Package, Activity, ChevronDown, ChevronUp,
  Cpu, Lock, BarChart3
} from 'lucide-react'
import clsx from 'clsx'

// ── Code block component ─────────────────────────────────────────────────────
function CodeBlock({ code, lang = 'bash', title }: { code: string; lang?: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <span className="mono text-[10px] text-[var(--color-muted)] uppercase tracking-widest">{title}</span>
          <span className="mono text-[10px] text-[var(--color-dim)] px-2 py-0.5 rounded border border-[var(--color-border)]">{lang}</span>
        </div>
      )}
      <div className="relative group">
        <pre className="p-4 text-[11px] leading-relaxed font-mono overflow-x-auto bg-[#03070e] text-[var(--color-text)]">
          <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
        </pre>
        <button
          onClick={copy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-[var(--color-elevated)] border border-[var(--color-border)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--color-teal)]/40"
        >
          {copied ? <Check className="w-3 h-3 text-[var(--color-teal)]" /> : <Copy className="w-3 h-3 text-[var(--color-muted)]" />}
        </button>
      </div>
    </div>
  )
}

// Minimal syntax highlighter
function highlight(code: string, lang: string): string {
  if (lang === 'bash' || lang === 'sh') {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(#.+)/g, '<span style="color:#2a5a3a">$1</span>')
      .replace(/(".*?")/g, '<span style="color:#ffd60a">$1</span>')
      .replace(/\b(curl|node|python|export|cd|npm|pip)\b/g, '<span style="color:#00ffc8">$1</span>')
      .replace(/(--\w[\w-]*|-[A-Za-z])\b/g, '<span style="color:#9b5de5">$1</span>')
  }
  if (lang === 'json') {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(".*?")\s*:/g, '<span style="color:#7df9ff">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span style="color:#ffd60a">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color:#39ff14">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span style="color:#ff6b35">$1</span>')
  }
  if (lang === 'ts' || lang === 'typescript') {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(\/\/.+)/g, '<span style="color:#2a5a3a">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color:#ffd60a">$1</span>')
      .replace(/\b(import|from|export|const|let|await|async|new|return|interface|type|class)\b/g, '<span style="color:#9b5de5">$1</span>')
      .replace(/\b(AuroraClient|aurora)\b/g, '<span style="color:#00ffc8">$1</span>')
  }
  if (lang === 'python') {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(#.+)/g, '<span style="color:#2a5a3a">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span style="color:#ffd60a">$1</span>')
      .replace(/\b(import|from|def|class|return|await|async|if|for|print)\b/g, '<span style="color:#9b5de5">$1</span>')
      .replace(/\b(AuroraClient|aurora)\b/g, '<span style="color:#00ffc8">$1</span>')
  }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Endpoint card component ──────────────────────────────────────────────────
function EndpointCard({
  method, path, desc, request, response, note
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string; desc: string
  request?: string; response: string; note?: string
}) {
  const [open, setOpen] = useState(false)
  const colors = { GET: '#39ff14', POST: '#00ffc8', PATCH: '#ffd60a', DELETE: '#ff3366' }
  return (
    <motion.div
      className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]/40"
      layout
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-elevated)]/30 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span
          className="mono text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0"
          style={{ color: colors[method], borderColor: colors[method] + '40', background: colors[method] + '08' }}
        >{method}</span>
        <span className="mono text-xs text-[var(--color-teal)] flex-1">{path}</span>
        <span className="text-[10px] text-[var(--color-muted)] hidden sm:block">{desc}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--color-dim)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--color-dim)]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] p-4 space-y-4">
              {note && <div className="text-[11px] text-[var(--color-muted)] bg-[var(--color-elevated)]/40 rounded-lg px-3 py-2 border border-[var(--color-border)]">{note}</div>}
              {request && <CodeBlock code={request} lang="json" title="Request body" />}
              <CodeBlock code={response} lang="json" title="Response" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Collapsible section ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, color = '#00ffc8', defaultOpen = false }: {
  title: string; icon: React.ElementType; children: React.ReactNode; color?: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 bg-[var(--color-surface)]/60 hover:bg-[var(--color-elevated)]/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '12', border: `1px solid ${color}30` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="display font-bold text-sm text-[var(--color-text)] flex-1">{title}</span>
        <ChevronRight className={clsx('w-4 h-4 text-[var(--color-dim)] transition-transform', open && 'rotate-90')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-5 space-y-4 border-t border-[var(--color-border)]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'quickstart', label: 'Quick Start',    icon: Zap        },
  { id: 'api',        label: 'API Reference',  icon: Globe      },
  { id: 'sdk',        label: 'SDKs',           icon: Package    },
  { id: 'realtime',   label: 'Real-time',      icon: Radio      },
  { id: 'security',   label: 'Security',       icon: Lock       },
  { id: 'concepts',   label: 'Concepts',       icon: BookOpen   },
]

// ── Quick start tab ──────────────────────────────────────────────────────────
function QuickStart() {
  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full border border-[var(--color-teal)]/40 flex items-center justify-center">
          <span className="mono text-[10px] text-[var(--color-teal)] font-bold">1</span>
        </div>
        <div className="flex-1 space-y-3 pt-0.5">
          <h3 className="display font-bold text-sm text-[var(--color-text)]">Boot the stack</h3>
          <CodeBlock lang="bash" code={`# Aurora Core deploys entirely on Vercel — no local setup needed
# 1. Fork: github.com/T3a165/Aurora-Core  (tap Fork in the GitHub mobile app)
# 2. Import to Vercel: vercel.com/new  → Import Git Repository
# 3. Set environment variables in Vercel dashboard:
#      ANTHROPIC_API_KEY   = sk-ant-...
#      INGEST_SECRET       = your-esp32-secret   (optional)
# 4. Deploy — your live URL is ready in ~90 seconds
#
# ESP32-C6 firmware: POST to https://your-app.vercel.app/api/ingest
# That's it. No Docker, no Node, no terminal required.`} />
          <p className="text-[11px] text-[var(--color-muted)]">The seed prints your installation ID and a one-time API key. Store it — it's hashed in the DB.</p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full border border-[var(--color-violet)]/40 flex items-center justify-center">
          <span className="mono text-[10px] text-[var(--color-violet)] font-bold">2</span>
        </div>
        <div className="flex-1 space-y-3 pt-0.5">
          <h3 className="display font-bold text-sm text-[var(--color-text)]">Send your first event</h3>
          <CodeBlock lang="bash" code={`# cURL
curl -X POST http://localhost:4000/v1/events \\
  -H "Authorization: Bearer ak_..." \\
  -H "Content-Type: application/json" \\
  -d '{"domain":"ENERGY","kind":"solar_w","value":1240}'

# → {"accepted":1,"results":[{"score":87,"trend":"stable"}]}`} />
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full border border-[var(--color-gold)]/40 flex items-center justify-center">
          <span className="mono text-[10px] text-[var(--color-gold)] font-bold">3</span>
        </div>
        <div className="flex-1 space-y-3 pt-0.5">
          <h3 className="display font-bold text-sm text-[var(--color-text)]">Read your first insight</h3>
          <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer ak_..." \\
  http://localhost:4000/v1/insights

# → {
#     "current": {
#       "score": 87,
#       "breakdown": {"energy":92,"biometric":80,"environment":90},
#       "trend": "stable",
#       "predictedScore": 87,
#       "signals": [],
#       "actions": []
#     }
#   }`} />
        </div>
      </div>

      {/* Step 4 */}
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full border border-[#39ff14]/40 flex items-center justify-center">
          <span className="mono text-[10px] text-[#39ff14] font-bold">4</span>
        </div>
        <div className="flex-1 space-y-3 pt-0.5">
          <h3 className="display font-bold text-sm text-[var(--color-text)]">Trigger a real action</h3>
          <CodeBlock lang="bash" code={`# Inject a high-CO₂ reading — Aurora auto-responds
curl -X POST http://localhost:4000/v1/events \\
  -H "Authorization: Bearer ak_..." \\
  -H "Content-Type: application/json" \\
  -d '{"domain":"ENVIRONMENT","kind":"co2_ppm","value":1700}'

# Subscribe to the action stream
wscat -c "ws://localhost:4000/v1/stream?api_key=ak_..."
# → {"type":"action","action":{"command":"set_ventilation","args":{"level":"high"},...}}`} />
          <p className="text-[11px] text-[var(--color-muted)]">
            That's the loop: <span className="mono text-[var(--color-teal)]">events → state → insights → actions</span>
          </p>
        </div>
      </div>

      {/* Simulate shortcut */}
      <div className="rounded-xl border border-[var(--color-teal)]/20 bg-[var(--color-teal)]/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-[var(--color-teal)]" />
          <span className="text-xs font-display font-bold text-[var(--color-teal)]">Fast-track with /simulate</span>
        </div>
        <p className="text-[11px] text-[var(--color-muted)]">Don't have real sensors? Inject a realistic burst of demo data instantly:</p>
        <CodeBlock lang="bash" code={`# Available scenarios: healthy | stress | peak_solar
curl -X POST http://localhost:4000/v1/simulate \\
  -H "Authorization: Bearer ak_..." \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"stress"}'

# → {"scenario":"stress","injected":6,"score":41}`} />
      </div>
    </div>
  )
}

// ── API Reference tab ────────────────────────────────────────────────────────
function ApiReference() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-[var(--color-muted)]">
        All endpoints require <span className="mono text-[var(--color-teal)]">Authorization: Bearer &lt;api-key&gt;</span>. Base URL: <span className="mono text-[var(--color-teal)]">https://your-api-host</span>.
        Rate limit: 120 req/min per key (headers: <span className="mono">X-RateLimit-Limit</span>, <span className="mono">X-RateLimit-Remaining</span>).
      </p>

      <EndpointCard
        method="POST" path="/v1/events" desc="Send sensor readings"
        request={`// Single event
{"domain":"ENERGY","kind":"solar_w","value":1240}

// Batch (array)
[
  {"domain":"ENERGY","kind":"load_w","value":820},
  {"domain":"BIOMETRIC","kind":"hr_bpm","value":68},
  {"domain":"ENVIRONMENT","kind":"co2_ppm","value":650}
]`}
        response={`{"accepted":3,"results":[{"score":89,"trend":"improving"},...]}`}
        note="domain: ENERGY | BIOMETRIC | ENVIRONMENT — kind values: load_w, solar_w, battery_soc, grid_price_cents, hr_bpm, hrv_ms, stress, temp_c, humidity, co2_ppm, pm25"
      />

      <EndpointCard
        method="GET" path="/v1/state" desc="Current live state"
        response={`{
  "installationId": "clx...",
  "state": {
    "energy":  {"loadW":820,"solarW":1240,"batterySoc":74,"gridPriceCents":18},
    "bio":     {"hr":68,"hrv":58,"stress":22},
    "env":     {"tempC":22.5,"humidity":47,"co2Ppm":650,"pm25":7},
    "updatedAt":1730000000000
  }
}`}
      />

      <EndpointCard
        method="GET" path="/v1/insights" desc="Score + signals + history"
        response={`{
  "current": {
    "score":87, "trend":"stable", "predictedScore":88,
    "breakdown":{"energy":92,"biometric":80,"environment":90,"mode":"habitat_optimizer"},
    "signals":[],
    "actions":[]
  },
  "history":[{"id":"...","score":86,"ts":"..."},...]
}`}
      />

      <EndpointCard
        method="GET" path="/v1/history" desc="Event time-series query"
        note="Query params: domain, kind, from (ISO), to (ISO), limit (max 2000)"
        response={`{
  "events":[
    {"id":"...","domain":"ENERGY","kind":"solar_w","value":1240,"ts":"2025-06-01T14:00:00Z"},
    ...
  ],
  "count":150,"from":"2025-06-01T00:00:00Z","to":"2025-06-02T00:00:00Z"
}`}
      />

      <EndpointCard
        method="GET" path="/v1/history/scores" desc="Score history with breakdown"
        note="Query params: from (ISO), to (ISO), limit (max 2000)"
        response={`{
  "scores":[
    {"id":"...","score":87,"breakdown":{...},"ts":"2025-06-01T14:00:00Z"},
    ...
  ],
  "count":200
}`}
      />

      <EndpointCard
        method="GET" path="/v1/devices" desc="List all devices"
        response={`{
  "devices":[
    {"id":"dev_1","kind":"turnbot","label":"TurnBot · Kitchen","state":{},"online":true},
    {"id":"dev_2","kind":"light","label":"Living Room Lights","state":{},"online":true},
    {"id":"dev_3","kind":"hvac","label":"Main HVAC","state":{},"online":true}
  ]
}`}
      />

      <EndpointCard
        method="POST" path="/v1/devices/:id/command" desc="Send device command"
        request={`{"command":"dim","args":{"level":30,"kelvin":2700},"reason":"manual"}`}
        response={`{
  "action":{"id":"act_...","command":"dim","args":{"level":30},"status":"PENDING","createdAt":"..."}
}`}
      />

      <EndpointCard
        method="GET" path="/v1/config/modes" desc="List available modes"
        response={`{
  "active":"habitat_optimizer",
  "available":[
    {"id":"energy_guardian","label":"Energy Guardian","focus":"Cost, solar, peak shaving","weights":{"energy":0.6,"bio":0.15,"env":0.25}},
    {"id":"health_sentinel","label":"Health Sentinel","focus":"HR, HRV, stress, recovery","weights":{"energy":0.15,"bio":0.6,"env":0.25}},
    {"id":"habitat_optimizer","label":"Habitat Optimizer","focus":"Balanced comfort and air quality","weights":{"energy":0.33,"bio":0.33,"env":0.34}}
  ]
}`}
      />

      <EndpointCard
        method="POST" path="/v1/config/mode" desc="Switch active mode"
        request={`{"mode":"energy_guardian"}`}
        response={`{"mode":"energy_guardian"}`}
      />

      <EndpointCard
        method="POST" path="/v1/chat" desc="AI natural language query"
        request={`{"message":"How is the air quality? Should I run the purifier?"}`}
        response={`{
  "reply":"CO₂ is at 650 ppm — well within safe range. PM2.5 is 7 µg/m³. Air quality is excellent right now, no action needed.",
  "score":87,
  "signals":[],
  "action":null
}`}
        note="Requires ANTHROPIC_API_KEY on the server. Returns Aurora's analysis grounded in live sensor data."
      />

      <EndpointCard
        method="POST" path="/v1/webhooks" desc="Register a webhook"
        request={`{
  "url":"https://your-server.com/aurora-hook",
  "events":["score.updated","alert.triggered"],
  "label":"My Alerting System"
}`}
        response={`{
  "webhook":{
    "id":"wh_...",
    "url":"https://your-server.com/aurora-hook",
    "events":["score.updated","alert.triggered"],
    "secret":"<store this — used to verify signatures>",
    "enabled":true
  }
}`}
        note="Payload includes HMAC-SHA256 signature in X-Aurora-Signature header. Events: score.updated, alert.triggered, or * for all."
      />

      <EndpointCard
        method="POST" path="/v1/simulate" desc="Inject demo events"
        request={`{"scenario":"stress"}`}
        response={`{"scenario":"stress","injected":6,"score":41}`}
        note="Scenarios: healthy | stress | peak_solar. Ideal for testing your integrations without real hardware."
      />

      <EndpointCard
        method="GET" path="/v1/export" desc="Full installation snapshot"
        response={`{
  "exportedAt":"2025-06-01T14:00:00Z",
  "installation":{"id":"...","name":"Demo Habitat","timezone":"UTC"},
  "mode":"habitat_optimizer",
  "state":{...},
  "devices":[...],
  "recentInsights":[...]
}`}
      />

      <EndpointCard
        method="GET" path="/health" desc="Service health check"
        response={`{"ok":true,"ts":1730000000000,"checks":{"redis":"ok","db":"ok"},"version":"2.0.0"}`}
      />

      {/* Error reference */}
      <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
        <h4 className="display font-bold text-xs text-[var(--color-text)]">Error responses</h4>
        <CodeBlock lang="json" code={`// All errors follow this shape:
{"error":{"code":"rate_limited","message":"Too many requests"}}

// Common codes:
// 401 missing_key     — No Authorization header
// 401 invalid_key     — Unknown or revoked key
// 422 invalid_payload — Validation failed
// 429 rate_limited    — Exceeded 120 req/min
// 404 not_found       — Resource not found
// 500 internal        — Server error`} />
      </div>
    </div>
  )
}

// ── SDK tab ──────────────────────────────────────────────────────────────────
function Sdks() {
  const [lang, setLang] = useState<'ts' | 'python'>('ts')
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['ts', 'python'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={clsx('px-3 py-1.5 rounded-lg mono text-xs border transition-all',
              lang === l
                ? 'border-[var(--color-teal)]/60 text-[var(--color-teal)] bg-[var(--color-teal)]/8'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]/30'
            )}
          >{l === 'ts' ? 'TypeScript / Node' : 'Python'}</button>
        ))}
      </div>

      {lang === 'ts' ? (
        <div className="space-y-4">
          <CodeBlock lang="bash" title="Install" code={`npm install @aurora/sdk
# or: yarn add @aurora/sdk`} />
          <CodeBlock lang="typescript" title="Setup" code={`import { AuroraClient } from "@aurora/sdk";

const aurora = new AuroraClient({
  baseUrl: "https://your-api-host",
  apiKey:  process.env.AURORA_API_KEY!,
});`} />
          <CodeBlock lang="typescript" title="Send energy readings + get insight" code={`// Send a batch of sensor readings
await aurora.sendEvent([
  { domain: "ENERGY",      kind: "solar_w",     value: 1350 },
  { domain: "ENERGY",      kind: "load_w",      value: 820  },
  { domain: "ENERGY",      kind: "battery_soc", value: 74   },
]);

// Read current insight
const { current } = await aurora.getInsights();
console.log(\`Score: \${current.score}/100 (\${current.trend})\`);
console.log(\`Predicted next: \${current.predictedScore}/100\`);
for (const sig of current.signals) {
  console.log(\`[\${sig.severity}] \${sig.message}\`);
  if (sig.recommendation) console.log(\`  → \${sig.recommendation}\`);
}`} />
          <CodeBlock lang="typescript" title="Send biometrics + detect strain" code={`await aurora.sendEvent([
  { domain: "BIOMETRIC", kind: "hr_bpm", value: 78  },
  { domain: "BIOMETRIC", kind: "hrv_ms", value: 45  },
  { domain: "BIOMETRIC", kind: "stress", value: 68  },
]);

const { current } = await aurora.getInsights();
const strain = current.signals.filter(s => s.kind.startsWith("bio."));
if (strain.length) {
  console.log("Aurora recommends:", strain[0].recommendation);
  // → "Dim lights to 30%, lower setpoint 1°C, suggest 5-min break"
}`} />
          <CodeBlock lang="typescript" title="Subscribe to real-time actions" code={`const unsubscribe = aurora.subscribe((msg) => {
  if (msg.type === "action") {
    const { command, args, reason } = msg.action;
    console.log(\`Action: \${command}\`, args, \`(\${reason})\`);
    // Execute on your device adapter here
  }
  if (msg.type === "score") {
    console.log(\`Score updated: \${msg.score} (\${msg.trend})\`);
  }
});

// Stop listening
unsubscribe();`} />
          <CodeBlock lang="typescript" title="Switch mode" code={`await aurora.setMode("energy_guardian");

// Verify
const modes = await aurora.getModes();
console.log("Active:", modes.active); // "energy_guardian"`} />
        </div>
      ) : (
        <div className="space-y-4">
          <CodeBlock lang="bash" title="Install" code={`pip install aurora-core-sdk
# or: poetry add aurora-core-sdk`} />
          <CodeBlock lang="python" title="Setup" code={`from aurora import AuroraClient

aurora = AuroraClient(
    base_url="https://your-api-host",
    api_key=os.environ["AURORA_API_KEY"],
)`} />
          <CodeBlock lang="python" title="Send energy readings + get insight" code={`import os
from aurora import AuroraClient

aurora = AuroraClient(os.environ["AURORA_API_KEY"], "https://your-api-host")

# Send batch of sensor readings
aurora.send_event([
    {"domain": "ENERGY",      "kind": "solar_w",     "value": 1350},
    {"domain": "ENERGY",      "kind": "load_w",      "value": 820},
    {"domain": "ENERGY",      "kind": "battery_soc", "value": 74},
])

# Read current insight
data = aurora.get_insights()
current = data["current"]
print(f"Score: {current['score']}/100 ({current['trend']})")
for sig in current["signals"]:
    print(f"[{sig['severity']}] {sig['message']}")
    if sig.get("recommendation"):
        print(f"  → {sig['recommendation']}")`} />
          <CodeBlock lang="python" title="Subscribe to real-time actions" code={`def handle_message(msg):
    if msg.get("type") == "action":
        action = msg["action"]
        print(f"Action: {action['command']} ({action['reason']})")
        # Execute on your device adapter here
    elif msg.get("type") == "score":
        print(f"Score: {msg['score']} ({msg['trend']})")

unsubscribe = aurora.subscribe(handle_message)
# Runs in a background thread — call unsubscribe() to stop`} />
        </div>
      )}
    </div>
  )
}

// ── Real-time tab ────────────────────────────────────────────────────────────
function Realtime() {
  return (
    <div className="space-y-5">
      <p className="text-[11px] text-[var(--color-muted)]">
        Aurora pushes live events over WebSocket. Connect with your API key as a query parameter.
      </p>

      <Section icon={Radio} title="WebSocket connection" color="#00ffc8" defaultOpen>
        <CodeBlock lang="bash" code={`# Connect — API key in query param
wscat -c "wss://your-api-host/v1/stream?api_key=ak_..."

# First message (hello)
← {"type":"hello","installationId":"clx..."}`} />
        <div className="space-y-2">
          {[
            { type: 'score',  color: '#00ffc8', ex: '{"type":"score","score":87,"breakdown":{...},"signals":[...],"trend":"stable","predictedScore":88}' },
            { type: 'state',  color: '#7df9ff', ex: '{"type":"state","state":{"energy":{...},"bio":{...},"env":{...},"updatedAt":...}}' },
            { type: 'action', color: '#ffd60a', ex: '{"type":"action","action":{"id":"...","command":"set_ventilation","args":{"level":"high"},"reason":"co2_high"}}' },
            { type: 'mode',   color: '#9b5de5', ex: '{"type":"mode","mode":"energy_guardian"}' },
          ].map(m => (
            <div key={m.type} className="rounded-lg border border-[var(--color-border)] p-3 space-y-1">
              <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: m.color, background: m.color + '12' }}>type: {m.type}</span>
              <pre className="mono text-[10px] text-[var(--color-muted)] leading-relaxed overflow-x-auto">{m.ex}</pre>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Webhook} title="Webhooks" color="#9b5de5">
        <p className="text-[11px] text-[var(--color-muted)]">Aurora posts to your HTTPS endpoint when events occur. Verify the signature.</p>
        <CodeBlock lang="bash" code={`# Register a webhook
curl -X POST https://your-api-host/v1/webhooks \\
  -H "Authorization: Bearer ak_..." \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourserver.com/hook","events":["alert.triggered"]}'`} />
        <CodeBlock lang="typescript" title="Verify webhook signature (Express)" code={`import { createHmac } from "crypto";

app.post("/hook", (req, res) => {
  const sig     = req.headers["x-aurora-signature"] as string;
  const secret  = process.env.WEBHOOK_SECRET!;
  const payload = JSON.stringify(req.body);
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

  if (sig !== expected) return res.status(401).json({ error: "Invalid signature" });

  const { event, payload: data } = req.body;
  console.log("Aurora event:", event, data);
  res.json({ received: true });
});`} />
      </Section>
    </div>
  )
}

// ── Security tab ────────────────────────────────────────────────────────────
function Security() {
  return (
    <div className="space-y-5">
      <Section icon={Key} title="API keys" color="#ffd60a" defaultOpen>
        <div className="grid gap-3">
          {[
            { t: 'Format',       v: 'ak_<48 hex chars> — prefix stored unmasked for display; actual key hashed with SHA-256' },
            { t: 'Scope',        v: 'events:write, state:read, actions:write — all assigned at seed time; custom scopes via DB' },
            { t: 'Rotation',     v: 'Run pnpm seed again or call POST /v1/keys (sets revokedAt on old key atomically)' },
            { t: 'Transmission', v: 'Always HTTPS in production. Never log the raw key — only the prefix (first 8 chars)' },
          ].map(r => (
            <div key={r.t} className="flex gap-3">
              <span className="mono text-[10px] text-[var(--color-teal)] w-24 flex-shrink-0 pt-0.5">{r.t}</span>
              <span className="text-[11px] text-[var(--color-muted)]">{r.v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={BarChart3} title="Rate limiting" color="#00ffc8">
        <p className="text-[11px] text-[var(--color-muted)] mb-3">Sliding window: 120 requests per minute per API key, enforced via Redis. Configurable via <span className="mono">RATE_LIMIT_PER_MIN</span> env var.</p>
        <CodeBlock lang="bash" code={`# Rate limit headers on every response:
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118

# When exceeded:
HTTP 429 Too Many Requests
{"error":{"code":"rate_limited","message":"Too many requests"}}`} />
      </Section>

      <Section icon={Activity} title="Audit log" color="#9b5de5">
        <p className="text-[11px] text-[var(--color-muted)] mb-3">Every device command and mode change writes to the AuditLog table. Query via API:</p>
        <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer ak_..." \\
  "https://your-api-host/v1/audit?limit=20"

# → {"logs":[{"actor":"api_key:ak_5fd9c0","action":"device.command","target":"dev_1","ts":"..."},...]}`} />
      </Section>

      <Section icon={Cpu} title="Safety by design" color="#ff3366">
        <div className="space-y-2 text-[11px] text-[var(--color-muted)]">
          <p>• <span className="text-[var(--color-text)]">Aurora never executes commands directly.</span> It produces <span className="mono text-[var(--color-teal)]">Action</span> records. Your device adapter decides whether to execute.</p>
          <p>• Bio scoring is intentionally <span className="text-[var(--color-text)]">non-medical and conservative</span>. Never use Aurora as a clinical device.</p>
          <p>• Every action and mode change is immutably written to <span className="mono text-[var(--color-teal)]">AuditLog</span>.</p>
          <p>• Webhook payloads are <span className="text-[var(--color-text)]">HMAC-SHA256 signed</span> — always verify before acting.</p>
        </div>
      </Section>
    </div>
  )
}

// ── Concepts tab ─────────────────────────────────────────────────────────────
function Concepts() {
  return (
    <div className="space-y-5">
      <Section icon={ArrowRight} title="How Aurora thinks: events → state → insights → actions" color="#00ffc8" defaultOpen>
        <CodeBlock lang="bash" code={`events ──▶ state ──▶ score + signals ──▶ actions ──▶ audit
                      ▲
                      │
                    mode`} />
        <div className="space-y-2 text-[11px] text-[var(--color-muted)]">
          {[
            ['events',  'Atomic readings ({domain, kind, value}) posted to /v1/events. Any device, any frequency.'],
            ['state',   'Latest known value per signal, held in Redis for microsecond access. Persisted to Postgres on every write.'],
            ['score',   '0-100 number computed from sub-scores for each domain, weighted by active mode.'],
            ['signals', 'Human-readable diagnostics with severity (info/warn/alert) and optional recommendations.'],
            ['actions', 'Device commands Aurora wants to issue. Your adapter executes (or ignores) them.'],
            ['mode',    'Rebalances score weighting — Energy Guardian, Health Sentinel, or Habitat Optimizer.'],
          ].map(([t, v]) => (
            <div key={t} className="flex gap-3">
              <span className="mono text-[10px] text-[var(--color-teal)] w-16 flex-shrink-0 pt-0.5">{t}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Activity} title="System Score explained" color="#9b5de5">
        <CodeBlock lang="bash" code={`score = round( energyScore × w_e + bioScore × w_b + envScore × w_v )

Mode weights:
┌─────────────────────┬────────┬──────┬──────┐
│ Mode                │ energy │  bio │  env │
├─────────────────────┼────────┼──────┼──────┤
│ Energy Guardian     │  0.60  │ 0.15 │ 0.25 │
│ Health Sentinel     │  0.15  │ 0.60 │ 0.25 │
│ Habitat Optimizer   │  0.33  │ 0.33 │ 0.34 │
└─────────────────────┴────────┴──────┴──────┘

Sub-score heuristics (apps/api/src/engine/scoring.ts):
  energyScore: solar coverage (50%) + battery SoC (28%) + tariff (20%) + export bonus (2%)
  bioScore:    penalise high HR, low HRV, high stress; reward high HRV
  envScore:    comfort-zone scoring for temp, humidity, CO₂ ppm, PM2.5`} />
      </Section>

      <Section icon={Cpu} title="Trend & prediction" color="#ffd60a">
        <div className="text-[11px] text-[var(--color-muted)] space-y-2">
          <p>After each event, Aurora fits a linear regression over the last 5 score samples to detect direction:</p>
          <div className="flex gap-3 flex-wrap">
            {[['improving', '#39ff14', 'slope > 1.5'], ['stable', '#00ffc8', '-1.5 ≤ slope ≤ 1.5'], ['degrading', '#ff3366', 'slope < -1.5']].map(([t, c, s]) => (
              <div key={t} className="flex items-center gap-2 px-2 py-1 rounded-lg border" style={{ borderColor: c + '30', background: c + '08' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                <span className="mono text-[10px]" style={{ color: c }}>{t}</span>
                <span className="mono text-[10px] text-[var(--color-dim)]">({s})</span>
              </div>
            ))}
          </div>
          <p>The <span className="mono text-[var(--color-teal)]">predictedScore</span> applies a ±3 point adjustment to the current score based on trend direction — a conservative near-term projection.</p>
        </div>
      </Section>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DevPortal() {
  const [tab, setTab] = useState('quickstart')

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-0 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Code2 className="w-4 h-4 text-[var(--color-teal)]" />
                <h1 className="display font-black text-lg text-[var(--color-teal)] tracking-wide">Developer Portal</h1>
                <span className="mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-teal)]/30 text-[var(--color-teal)]/70">v2.0 API</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">Integrate Aurora Core into anything. REST + WebSocket + Webhooks.</p>
            </div>
            <a
              href="https://github.com/T3a165/Aurora-Core"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-teal)]/30 transition-all mono flex-shrink-0"
            >
              <Terminal className="w-3 h-3" /> View source
            </a>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg mono text-[10px] whitespace-nowrap border transition-all flex-shrink-0',
                  tab === t.id
                    ? 'border-[var(--color-teal)]/50 text-[var(--color-teal)] bg-[var(--color-teal)]/8'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]/60'
                )}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'quickstart' && <QuickStart />}
              {tab === 'api'        && <ApiReference />}
              {tab === 'sdk'        && <Sdks />}
              {tab === 'realtime'   && <Realtime />}
              {tab === 'security'   && <Security />}
              {tab === 'concepts'   && <Concepts />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}
