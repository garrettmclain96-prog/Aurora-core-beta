// Simulated demo client — runs entirely in-browser, no API needed.
// Activated automatically when NEXT_PUBLIC_API_KEY is empty.

import type { AuroraClient as AuroraClientType } from "@aurora/sdk";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function jitter(v: number, range: number) {
  return v + (Math.random() - 0.5) * range;
}

// Mutable simulated state
const sim = {
  loadW:          900,
  solarW:         420,
  batterySoc:     74,
  gridPriceCents: 18,
  hr:             64,
  hrv:            52,
  stress:         22,
  tempC:          22.4,
  humidity:       47,
  co2Ppm:         640,
  pm25:           7,
  tick:           0,
};

function step() {
  const hour = new Date().getHours();
  sim.solarW         = hour >= 7 && hour <= 19 ? clamp(jitter(sim.solarW, 40), 0, 600) : 0;
  sim.loadW          = clamp(jitter(sim.loadW, 30), 600, 1200);
  sim.batterySoc     = clamp(sim.batterySoc + (Math.random() > 0.6 ? -0.1 : 0.05), 55, 98);
  sim.gridPriceCents = clamp(jitter(sim.gridPriceCents, 2), 8, 42);
  sim.hr             = clamp(jitter(sim.hr,   1.5), 52, 88);
  sim.hrv            = clamp(jitter(sim.hrv,  2),   28, 78);
  sim.stress         = clamp(jitter(sim.stress, 2), 5,  75);
  sim.tempC          = clamp(jitter(sim.tempC, 0.1), 19, 27);
  sim.humidity       = clamp(jitter(sim.humidity, 0.5), 30, 65);
  sim.co2Ppm         = clamp(jitter(sim.co2Ppm, 15), 400, 900);
  sim.pm25           = clamp(jitter(sim.pm25, 1), 2, 30);
  sim.tick++;
}

function calcScores() {
  const coverage  = sim.loadW > 0 ? Math.min(1, sim.solarW / sim.loadW) : 1;
  const battery   = sim.batterySoc / 100;
  const tariff    = sim.gridPriceCents <= 10 ? 1 : sim.gridPriceCents >= 40 ? 0 : (40 - sim.gridPriceCents) / 30;
  const energy    = Math.round(clamp(coverage * 50 + battery * 30 + tariff * 20, 0, 100));

  const hrPenalty  = sim.hr > 100 ? (sim.hr - 100) * 1.2 : sim.hr < 50 ? (50 - sim.hr) * 1.2 : 0;
  const hrvPenalty = sim.hrv < 40 ? (40 - sim.hrv) * 1.5 : 0;
  const biometric  = Math.round(clamp(100 - hrPenalty - hrvPenalty - sim.stress * 0.4, 0, 100));

  const temp    = sim.tempC < 18 || sim.tempC > 26 ? 60 : 100;
  const hum     = sim.humidity < 30 || sim.humidity > 60 ? 70 : 100;
  const co2     = sim.co2Ppm > 1500 ? 30 : sim.co2Ppm > 1000 ? 65 : 100;
  const pm      = sim.pm25 > 35 ? 30 : sim.pm25 > 15 ? 70 : 100;
  const environment = Math.round((temp + hum + co2 + pm) / 4);

  const score = Math.round(energy * 0.33 + biometric * 0.33 + environment * 0.34);
  return { score, breakdown: { energy, biometric, environment, mode: "habitat_optimizer" } };
}

function buildSignals() {
  const signals: Array<{ kind: string; severity: string; message: string; recommendation?: string }> = [];
  if (sim.co2Ppm > 800)   signals.push({ kind: "env.co2",       severity: "warn",  message: `CO₂ at ${Math.round(sim.co2Ppm)} ppm`, recommendation: "Increase ventilation" });
  if (sim.stress > 65)    signals.push({ kind: "bio.high_strain", severity: "warn", message: "Stress elevated", recommendation: "Dim lights, take a break" });
  if (sim.batterySoc < 20) signals.push({ kind: "energy.battery", severity: "alert", message: `Battery at ${Math.round(sim.batterySoc)}%`, recommendation: "Enable grid charge" });
  return signals;
}

function getState() {
  return {
    state: {
      energy: { loadW: Math.round(sim.loadW), solarW: Math.round(sim.solarW), batterySoc: +sim.batterySoc.toFixed(1), gridPriceCents: Math.round(sim.gridPriceCents) },
      bio:    { hr: Math.round(sim.hr), hrv: Math.round(sim.hrv), stress: Math.round(sim.stress) },
      env:    { tempC: +sim.tempC.toFixed(1), humidity: Math.round(sim.humidity), co2Ppm: Math.round(sim.co2Ppm), pm25: +sim.pm25.toFixed(1) },
      updatedAt: Date.now(),
    }
  };
}

function getInsights() {
  const { score, breakdown } = calcScores();
  return {
    current:  { score, breakdown, signals: buildSignals(), actions: [] },
    history:  Array.from({ length: 8 }, (_, i) => ({
      id: String(i), score: Math.round(clamp(score + (Math.random() - 0.5) * 12, 40, 100)),
      ts: new Date(Date.now() - i * 60_000).toISOString(),
    })),
  };
}

const DEMO_DEVICES = [
  { id: "dev_1", kind: "turnbot", label: "TurnBot · Kitchen",    state: {}, online: true },
  { id: "dev_2", kind: "light",   label: "Living Room Lights",   state: {}, online: true },
  { id: "dev_3", kind: "hvac",    label: "Main HVAC",            state: {}, online: true },
];

const DEMO_MODES = {
  active: "habitat_optimizer",
  available: [
    { id: "energy_guardian",   label: "Energy Guardian",   focus: "Cost, solar self-consumption, peak shaving" },
    { id: "health_sentinel",   label: "Health Sentinel",   focus: "HR, HRV, stress, recovery (non-medical)" },
    { id: "habitat_optimizer", label: "Habitat Optimizer", focus: "Balanced comfort and air quality" },
  ],
};

let activeMode = "habitat_optimizer";

// Fake EventSource that emits simulated state every 2.5s
class DemoEventSource {
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _listeners: Map<string, ((e: MessageEvent) => void)[]> = new Map();

  constructor() {
    this._interval = setInterval(() => {
      step();
      const { score, breakdown } = calcScores();
      this._emit("score",  { score, breakdown, signals: buildSignals() });
      this._emit("state",  getState().state);
    }, 2500);
  }

  private _emit(type: string, data: unknown) {
    const msg = { data: JSON.stringify({ type, ...( typeof data === "object" ? data : { data }) }) } as MessageEvent;
    (this._listeners.get("message") ?? []).forEach(fn => fn(msg));
  }

  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type)!.push(fn);
  }

  close() {
    if (this._interval) clearInterval(this._interval);
  }
}

// Export a demo WebSocket-compatible interface
export class DemoWebSocket extends EventTarget {
  private _es: DemoEventSource;
  readyState = 1;

  constructor() {
    super();
    this._es = new DemoEventSource();
    this._es.addEventListener("message", (e) => {
      const event = new MessageEvent("message", { data: e.data });
      this.dispatchEvent(event);
      (this as unknown as { onmessage?: (e: MessageEvent) => void }).onmessage?.(event);
    });
    setTimeout(() => {
      (this as unknown as { onopen?: () => void }).onopen?.();
    }, 100);
  }

  close() { this._es.close(); }
  send() {}
}

// Demo client matching AuroraClient interface
export const demoAurora = {
  async getState()    { step(); return getState(); },
  async getInsights() { return getInsights(); },
  async getDevices()  { return { devices: DEMO_DEVICES }; },
  async getModes()    { return { ...DEMO_MODES, active: activeMode }; },
  async setMode(mode: string) { activeMode = mode; return { mode }; },
  async sendEvent()   { return { accepted: 1 }; },
  async command(deviceId: string, command: string) {
    return { action: { id: `act_demo_${Date.now()}`, command, deviceId } };
  },
} as unknown as InstanceType<typeof AuroraClientType>;
