"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ScoreGauge } from "./ScoreGauge";
import { MetricCard } from "./MetricCard";
import { isDemoMode, DemoWebSocket } from "@/lib/aurora";

interface State {
  energy: { loadW: number; solarW: number; batterySoc: number; gridPriceCents: number };
  bio:    { hr: number; hrv: number; stress: number };
  env:    { tempC: number; humidity: number; co2Ppm: number; pm25: number };
}
interface Breakdown { energy: number; biometric: number; environment: number; mode: string; }
interface Signal    { kind: string; severity: "info"|"warn"|"alert"; message: string; recommendation?: string; }

const SEVERITY_COLOR = { alert: "#ff5f7e", warn: "#f5d76e", info: "#22f1d3" } as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export function LiveStream({ initialState, initialScore, initialBreakdown }: {
  initialState:      State;
  initialScore:      number;
  initialBreakdown?: Breakdown;
}) {
  const [state,     setState]     = useState<State>(initialState);
  const [score,     setScore]     = useState(initialScore);
  const [breakdown, setBreakdown] = useState<Breakdown | undefined>(initialBreakdown);
  const [signals,   setSignals]   = useState<Signal[]>([]);
  const [wsStatus,  setWsStatus]  = useState<"live"|"connecting"|"reconnecting"|"error">(
    isDemoMode ? "live" : "connecting"
  );

  const wsRef      = useRef<WebSocket | null>(null);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const unmounted  = useRef(false);

  const handleMessage = useCallback((data: string) => {
    try {
      const m = JSON.parse(data);
      if (m.type === "state")  setState(m as State & { type: string });
      if (m.type === "score") {
        setScore(m.score);
        if (m.breakdown) setBreakdown(m.breakdown);
        if (m.signals)   setSignals(m.signals);
      }
      // demo emits flat merged object
      if (m.loadW !== undefined) setState({ energy: m, bio: m, env: m });
    } catch { /* ignore */ }
  }, []);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    setWsStatus(retryCount.current > 0 ? "reconnecting" : "connecting");

    const ws: WebSocket = isDemoMode
      ? new (DemoWebSocket as unknown as typeof WebSocket)()
      : new WebSocket(`${API_URL.replace(/^http/, "ws")}/v1/stream?api_key=${API_KEY}`);

    wsRef.current = ws;

    ws.onopen    = () => { retryCount.current = 0; setWsStatus("live"); };
    ws.onmessage = (ev) => handleMessage(ev.data as string);
    ws.onerror   = () => setWsStatus("error");
    ws.onclose   = () => {
      if (unmounted.current || isDemoMode) return;
      const delay = Math.min(1_000 * 2 ** retryCount.current, 30_000);
      retryCount.current++;
      setWsStatus("reconnecting");
      retryRef.current = setTimeout(connect, delay);
    };
  }, [handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      unmounted.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <div className="space-y-4">
      {wsStatus !== "live" && !isDemoMode && (
        <div className={`text-xs px-3 py-1.5 rounded border flex items-center gap-2 ${
          wsStatus === "error" ? "border-red-500/40 text-red-400" : "border-teal/20 text-teal/50"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            wsStatus === "connecting" || wsStatus === "reconnecting" ? "bg-teal/50 animate-pulse" : "bg-red-500"
          }`} />
          {wsStatus === "connecting"   && "Connecting to Aurora stream…"}
          {wsStatus === "reconnecting" && `Reconnecting… (attempt ${retryCount.current})`}
          {wsStatus === "error"        && "Stream error — showing last known state"}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <ScoreGauge score={score} breakdown={breakdown} />

        <MetricCard title="Energy" items={[
          ["Load (W)",   Math.round(state.energy.loadW)],
          ["Solar (W)",  Math.round(state.energy.solarW)],
          ["Battery",    `${Math.round(state.energy.batterySoc)}%`],
          ["Tariff (¢)", state.energy.gridPriceCents],
        ]} />

        <MetricCard title="Biometrics" items={[
          ["HR (bpm)", Math.round(state.bio.hr)],
          ["HRV (ms)", Math.round(state.bio.hrv)],
          ["Stress",   `${Math.round(state.bio.stress)}/100`],
        ]} />

        <MetricCard title="Environment" items={[
          ["Temp (°C)",  state.env.tempC.toFixed(1)],
          ["Humidity",   `${Math.round(state.env.humidity)}%`],
          ["CO₂ (ppm)",  Math.round(state.env.co2Ppm)],
          ["PM2.5",      `${state.env.pm25.toFixed(1)} µg/m³`],
        ]} />

        <div className="panel p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-widest text-teal/70 mb-3 flex items-center gap-2">
            Signals
            {signals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-line text-teal/60">
                {signals.length}
              </span>
            )}
          </div>
          {signals.length === 0 ? (
            <div className="flex items-center gap-2 text-teal/40 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal/40" /> All clear.
            </div>
          ) : (
            <div className="space-y-2">
              {signals.map((s, i) => (
                <div key={i} className="border-l-2 pl-3 py-0.5" style={{ borderColor: SEVERITY_COLOR[s.severity as keyof typeof SEVERITY_COLOR] ?? "#22f1d3" }}>
                  <div className="text-sm">{s.message}</div>
                  {s.recommendation && <div className="text-xs text-teal/50 mt-0.5">→ {s.recommendation}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
