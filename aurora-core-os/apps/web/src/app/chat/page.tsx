"use client";
import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { parse, execute } from "@/lib/commands";
import { aurora } from "@/lib/aurora";

interface Msg {
  who:  "you" | "aurora";
  text: string;
  ts:   number;
}

// ── Inline markdown renderer ─────────────────────────────────────────────────
// Handles **bold**, `code`, code blocks, bullet lists, and line breaks.
function Markdown({ text }: { text: string }) {
  // Code blocks first (```...```)
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3).replace(/^[a-z]+\n/, ""); // strip lang tag
          return (
            <pre key={i} className="bg-line/60 rounded p-2 text-xs overflow-x-auto my-1 text-teal/80 font-mono">
              {inner}
            </pre>
          );
        }

        // Inline formatting
        return (
          <span key={i}>
            {part.split("\n").map((line, li, arr) => {
              const formatted = line
                .split(/(\*\*.*?\*\*|`.*?`)/g)
                .map((chunk, ci) => {
                  if (chunk.startsWith("**") && chunk.endsWith("**"))
                    return <strong key={ci} className="text-teal font-semibold">{chunk.slice(2, -2)}</strong>;
                  if (chunk.startsWith("`") && chunk.endsWith("`"))
                    return <code key={ci} className="bg-line/80 px-1 rounded text-xs font-mono text-magenta/80">{chunk.slice(1, -1)}</code>;
                  // Leading bullet
                  if (chunk.startsWith("• ")) return <span key={ci}>{chunk}</span>;
                  return <span key={ci}>{chunk}</span>;
                });

              return (
                <span key={li}>
                  {formatted}
                  {li < arr.length - 1 && <br />}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "How am I doing?",
  "Any warnings?",
  "Optimize for sleep tonight",
  "Save energy",
  "/show devices",
  "/export",
];

export default function ChatPage() {
  const [msgs,    setMsgs]    = useState<Msg[]>([
    { who: "aurora", text: "Aurora online. Ask anything, or try `/help` for commands.", ts: Date.now() },
  ]);
  const [input,   setInput]   = useState("");
  const [score,   setScore]   = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Initial score fetch + WS subscription
  useEffect(() => {
    aurora.getInsights().then(i => setScore(i.current.score)).catch(() => {});

    const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace("http", "ws")}/v1/stream?api_key=${process.env.NEXT_PUBLIC_API_KEY ?? ""}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data as string);
        if (m.type === "score") setScore(m.score);
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const push = (msg: Msg) => setMsgs(m => [...m, msg]);

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    setInput("");
    push({ who: "you", text: t, ts: Date.now() });
    setLoading(true);

    if (t === "/help" || t.toLowerCase() === "help") {
      push({ who: "aurora", text: [
        "**Commands**",
        "• `/show score|insights|state|devices|modes|history`",
        "• `/set mode=energy_guardian|health_sentinel|habitat_optimizer`",
        "• `/export` — export current config as JSON",
        "• `/device id=<id> command=<cmd>` — send device command",
        "",
        "**Natural language works too:**",
        `"How am I doing?" · "Any warnings?" · "Optimize for sleep"`,
      ].join("\n"), ts: Date.now() });
      setLoading(false);
      inputRef.current?.focus();
      return;
    }

    try {
      const reply = await execute(parse(t));
      push({ who: "aurora", text: reply, ts: Date.now() });
    } catch (e: unknown) {
      push({ who: "aurora", text: `Error: ${(e as Error).message}`, ts: Date.now() });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const scoreColor =
    score === null ? "text-teal/40" :
    score >= 75    ? "text-teal glow" :
    score >= 50    ? "text-yellow-400" :
                     "text-red-400";

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl text-teal glow">/chat</h1>
        <div className={`text-sm font-bold font-mono ${scoreColor}`}>
          {score !== null ? `${score}/100` : "—"}
          <span className="text-teal/30 text-xs font-normal ml-1">system score</span>
        </div>
      </div>

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 panel p-4 overflow-y-auto space-y-3 scroll-smooth"
      >
        {msgs.map((m, i) => (
          <div key={i} className={m.who === "you" ? "text-right" : ""}>
            <div className={`inline-block px-3 py-2 rounded-lg max-w-[85%] text-sm text-left ${
              m.who === "you"
                ? "bg-teal/10 border border-teal/30 text-teal"
                : "bg-magenta/5 border border-magenta/20 text-teal/90"
            }`}>
              <Markdown text={m.text} />
            </div>
            <div className="text-[9px] text-teal/20 mt-0.5 px-1">
              {new Date(m.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-1 px-3 py-2 w-fit">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-magenta/60 animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 flex-wrap">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs px-2 py-1 rounded border border-line text-teal/50 hover:border-teal/40 hover:text-teal transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder='Ask Aurora… ("optimize for sleep" or /show insights)'
          disabled={loading}
          className="flex-1 panel px-4 py-3 bg-panel text-teal placeholder:text-teal/25 outline-none focus:border-teal/40 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-5 py-3 border border-teal/60 text-teal hover:bg-teal/10 rounded disabled:opacity-30 transition-colors"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
