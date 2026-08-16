import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Sparkles, RotateCcw, Zap, Activity, Brain, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { PageTransition } from '../components/PageTransition'

type Message = { role: 'user' | 'assistant'; content: string }

type ToolUse = {
  name: string
  input: Record<string, unknown>
}

type Insight = {
  type: string; title: string; finding: string
  recommendation: string; confidence: number; impact: string
}

type AssistantMsg = {
  role: 'assistant'
  content: string
  toolUses?: ToolUse[]
  insight?: Insight
}

type ChatMsg = { role: 'user'; content: string } | AssistantMsg

const STARTERS = [
  { icon: '⚡', text: 'Analyze my current energy state and optimize dispatch' },
  { icon: '❤️', text: 'What does my HRV data say about stress right now?' },
  { icon: '🔮', text: 'Run a Monte Carlo simulation for tonight\'s peak window' },
  { icon: '⚠️', text: 'Why is the Energy agent in conflict? Fix it.' },
  { icon: '🌱', text: 'How much CO₂ have I avoided this month?' },
  { icon: '🔋', text: 'Should I charge or hold battery given today\'s solar forecast?' },
]

const ACTION_ICONS: Record<string, typeof Zap> = {
  toggle_circuit:     Zap,
  set_battery_mode:   Activity,
  control_turnbot:    Brain,
  run_scenario:       TrendingUp,
  set_agent_priority: Brain,
  send_alert:         AlertTriangle,
}

const IMPACT_COLORS: Record<string, string> = {
  low:      'var(--color-muted)',
  medium:   'var(--color-amber)',
  high:     'var(--color-green)',
  critical: 'var(--color-red)',
}

function ToolUseCard({ tool }: { tool: ToolUse }) {
  const Icon = ACTION_ICONS[tool.input.action as string] ?? Zap
  const isQuery   = tool.name === 'query_system_state'
  const isInsight = tool.name === 'generate_insight'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-2 rounded-lg border overflow-hidden"
      style={{
        borderColor: isInsight ? 'oklch(0.82 0.16 196 / 0.3)' : isQuery ? 'oklch(0.68 0.22 290 / 0.3)' : 'oklch(0.74 0.17 145 / 0.3)',
        backgroundColor: isInsight ? 'oklch(0.82 0.16 196 / 0.05)' : isQuery ? 'oklch(0.68 0.22 290 / 0.05)' : 'oklch(0.74 0.17 145 / 0.05)',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-4 h-4 flex-shrink-0">
          {isInsight ? <Sparkles className="w-4 h-4 text-[var(--color-cyan)]" /> :
           isQuery   ? <Activity  className="w-4 h-4 text-[var(--color-purple)]" /> :
                       <Icon      className="w-4 h-4 text-[var(--color-green)]" />}
        </div>
        <span className="mono text-[9px] tracking-widest uppercase" style={{
          color: isInsight ? 'var(--color-cyan)' : isQuery ? 'var(--color-purple)' : 'var(--color-green)',
        }}>
          {tool.name.replace(/_/g, ' ')}
        </span>
        <CheckCircle2 className="w-3 h-3 ml-auto text-[var(--color-green)]" />
      </div>
      <div className="px-3 py-2.5 space-y-1">
        {Object.entries(tool.input).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="mono text-[9px] text-[var(--color-dim)] w-20 flex-shrink-0">{k}</span>
            <span className="text-[10px] text-[var(--color-muted)] flex-1">{String(v)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const impactColor = IMPACT_COLORS[insight.impact] ?? 'var(--color-cyan)'
  const TypeIcon = insight.type === 'warning' ? AlertTriangle : insight.type === 'health' ? Activity : TrendingUp

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border overflow-hidden"
      style={{ borderColor: impactColor + '50', backgroundColor: impactColor.replace(')', ' / 0.06)').replace('var(', 'oklch(').includes('oklch') ? 'transparent' : impactColor + '08' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: impactColor + '08' }}>
        <TypeIcon className="w-4 h-4" style={{ color: impactColor }} />
        <div className="flex-1">
          <div className="text-xs font-display font-bold text-[var(--color-text)]">{insight.title}</div>
          <div className="mono text-[9px]" style={{ color: impactColor }}>{insight.type.toUpperCase()} · IMPACT: {insight.impact.toUpperCase()}</div>
        </div>
        <div className="text-right">
          <div className="mono text-lg font-bold" style={{ color: impactColor }}>{insight.confidence}</div>
          <div className="mono text-[8px] text-[var(--color-dim)]">CONF%</div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div>
          <div className="text-[9px] font-display uppercase tracking-wider text-[var(--color-muted)] mb-1">Finding</div>
          <p className="text-xs text-[var(--color-text)] leading-relaxed">{insight.finding}</p>
        </div>
        <div>
          <div className="text-[9px] font-display uppercase tracking-wider text-[var(--color-muted)] mb-1">Recommendation</div>
          <p className="text-xs text-[var(--color-text)] leading-relaxed">{insight.recommendation}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setError(null)
    const userMsg: ChatMsg = { role: 'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const apiMessages = history
        .filter(m => m.role === 'user' || (m.role === 'assistant' && (m as AssistantMsg).content))
        .map(m => ({ role: m.role, content: (m as { content: string }).content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as {
        content: Array<{
          type: string; text?: string
          name?: string; input?: Record<string, unknown>
        }>
        stop_reason: string
      }

      // Parse content blocks
      let textContent = ''
      const toolUses: ToolUse[] = []
      let insight: Insight | undefined

      for (const block of data.content) {
        if (block.type === 'text' && block.text) {
          textContent += block.text
        } else if (block.type === 'tool_use' && block.name && block.input) {
          toolUses.push({ name: block.name, input: block.input })
          if (block.name === 'generate_insight') {
            insight = block.input as unknown as Insight
          }
        }
      }

      const assistantMsg: AssistantMsg = {
        role: 'assistant',
        content: textContent || '',
        toolUses: toolUses.length ? toolUses : undefined,
        insight,
      }
      setMessages([...history, assistantMsg])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg.includes('ANTHROPIC_API_KEY') || msg.includes('401')
        ? 'API key not configured — add ANTHROPIC_API_KEY in Vercel environment variables.'
        : `Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setMessages([]); setError(null) }

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3 border-b border-[var(--color-border)]">
          <div>
            <h1 className="font-display font-bold text-lg text-[var(--color-text)] tracking-wide">AURORA Intelligence</h1>
            <p className="text-[10px] text-[var(--color-muted)] font-display tracking-wide">Active decision-making core · Tool-augmented Claude Sonnet</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[oklch(0.82_0.16_196_/_0.3)] bg-[oklch(0.82_0.16_196_/_0.06)]">
              <span className="status-dot pulse-dot" style={{ backgroundColor: 'var(--color-green)', width: 5, height: 5 }} />
              <span className="mono text-[9px] text-[var(--color-cyan)] tracking-wider">3 TOOLS ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">

          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-6 py-8">
              {/* Aurora avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-16 h-16 rounded-2xl aurora-gradient border border-[oklch(0.82_0.16_196_/_0.4)] flex items-center justify-center glow-cyan">
                  <Sparkles className="w-7 h-7 text-[var(--color-cyan)]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-green)] border-2 border-[var(--color-bg)] flex items-center justify-center">
                  <span className="text-[6px] font-bold text-white">✓</span>
                </div>
              </motion.div>

              <div className="text-center max-w-sm">
                <div className="font-display font-bold text-base text-[var(--color-text)] mb-1">AURORA is online</div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  I have access to your live system state, 3 active tools, and the full cognitive stack.
                  Ask me anything — or tell me what to do.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {STARTERS.map(s => (
                  <motion.button
                    key={s.text}
                    onClick={() => send(s.text)}
                    whileHover={{ x: 4 }}
                    className="card text-left px-4 py-3 hover:card-active flex items-center gap-3 group transition-all"
                  >
                    <span className="text-base flex-shrink-0">{s.icon}</span>
                    <span className="text-xs text-[var(--color-muted)] group-hover:text-[var(--color-text)] font-display transition-colors">{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg aurora-gradient border border-[oklch(0.82_0.16_196_/_0.35)] flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-cyan)]" />
                  </div>
                )}

                <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'flex-1'}`}>
                  {m.role === 'user' ? (
                    <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed bg-[oklch(0.82_0.16_196_/_0.10)] border border-[oklch(0.82_0.16_196_/_0.20)] text-[var(--color-text)]">
                      {m.content}
                    </div>
                  ) : (
                    <div>
                      {/* Tool use cards */}
                      {(m as AssistantMsg).toolUses?.filter(t => t.name !== 'generate_insight').map((tool, ti) => (
                        <ToolUseCard key={ti} tool={tool} />
                      ))}

                      {/* Text response */}
                      {(m as AssistantMsg).content && (
                        <div className="card px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-[var(--color-text)] mt-2">
                          {(m as AssistantMsg).content}
                        </div>
                      )}

                      {/* Insight card */}
                      {(m as AssistantMsg).insight && (
                        <InsightCard insight={(m as AssistantMsg).insight!} />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg aurora-gradient border border-[oklch(0.82_0.16_196_/_0.35)] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-cyan)]" />
              </div>
              <div className="card px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-cyan)]" />
                <span className="text-xs text-[var(--color-muted)] font-display">AURORA processing…</span>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card border-[var(--color-amber)] bg-[oklch(0.80_0.17_72_/_0.05)] px-4 py-3 text-xs text-[var(--color-amber)] font-display">
              ⚠ {error}
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 md:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            {messages.length > 0 && (
              <button onClick={reset} className="p-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 card flex items-end gap-2 px-3 py-2.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder="Ask AURORA or issue a command…"
                className="flex-1 bg-transparent outline-none resize-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-dim)] font-sans leading-relaxed"
                style={{ maxHeight: 120 }}
              />
              <motion.button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-lg flex-shrink-0 transition-all disabled:opacity-30"
                style={{ backgroundColor: 'oklch(0.82 0.16 196 / 0.15)', color: 'var(--color-cyan)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>
          <div className="text-[9px] text-[var(--color-dim)] text-center mt-1.5 font-display tracking-wider">
            AURORA has execute_system_action · query_system_state · generate_insight
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
