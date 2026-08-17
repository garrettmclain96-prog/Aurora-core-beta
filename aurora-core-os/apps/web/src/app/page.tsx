import { Suspense } from "react";
import { aurora, isDemoMode } from "@/lib/aurora";
import { LiveStream } from "@/components/LiveStream";
import { ModeSelector } from "@/components/ModeSelector";

export const dynamic = "force-dynamic";

function DemoBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded border border-teal/20 bg-teal/5 text-xs text-teal/60">
      <span className="w-1.5 h-1.5 rounded-full bg-teal/60 animate-pulse flex-shrink-0" />
      <span>
        <strong className="text-teal/80">Demo mode</strong> — simulated live data.
        Connect a real API by setting <code className="text-teal/70">NEXT_PUBLIC_API_KEY</code>.
      </span>
    </div>
  );
}

async function DashboardContent() {
  const [{ state }, insights, modes] = await Promise.all([
    aurora.getState(),
    aurora.getInsights(),
    aurora.getModes(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-teal glow">Aurora Console</h1>
        <div className="flex items-center gap-3 text-xs text-teal/50">
          <span className="w-1.5 h-1.5 rounded-full bg-teal/60 animate-pulse" />
          {modes.active.replace(/_/g, " ")}
        </div>
      </div>

      {isDemoMode && <DemoBanner />}

      <LiveStream
        initialState={state}
        initialScore={insights.current.score}
        initialBreakdown={insights.current.breakdown}
      />

      <div className="grid md:grid-cols-3 gap-4">
        <ModeSelector initial={modes.active} />

        <div className="panel p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-widest text-teal/70 mb-3">Score History</div>
          {!insights.history?.length ? (
            <div className="text-teal/40 text-sm">No history yet.</div>
          ) : (
            <div className="space-y-1.5">
              {(insights.history as Array<{ id: string; score: number; ts: string }>).slice(0, 8).map(h => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs font-bold font-mono w-7 text-right ${
                    h.score >= 75 ? "text-teal" : h.score >= 50 ? "text-yellow-400" : "text-red-400"
                  }`}>{h.score}</span>
                  <div className="flex-1 h-1 bg-line rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${h.score}%`,
                      backgroundColor: h.score >= 75 ? "#22f1d3" : h.score >= 50 ? "#f5d76e" : "#ff5f7e",
                    }} />
                  </div>
                  <span className="text-teal/30 text-xs w-16 text-right">
                    {new Date(h.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function Page() {
  try {
    return (
      <Suspense fallback={
        <div className="space-y-5 animate-pulse">
          <div className="h-8 w-48 bg-line rounded" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="panel h-56" />)}
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    );
  } catch {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl text-teal glow">Aurora Console</h1>
        {isDemoMode && <DemoBanner />}
        <div className="panel p-8 text-center space-y-3">
          <div className="text-3xl">⚡</div>
          <div className="text-teal/60">Aurora is starting up…</div>
          <div className="text-teal/30 text-xs font-mono">Refresh in a moment.</div>
        </div>
      </div>
    );
  }
}
