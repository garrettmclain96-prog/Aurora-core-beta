import type { InstallationState, Mode, ScoreBreakdown, Signal, DecisionResult } from "./types.js";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// ── Sub-scores (0..100, higher = better) ─────────────────────────────────────

export function energyScore(s: InstallationState["energy"]) {
  const coverage = s.loadW <= 0 ? 1 : Math.min(1, s.solarW / s.loadW);
  const battery  = clamp(s.batterySoc, 0, 100) / 100;
  const tariff   = s.gridPriceCents <= 10 ? 1 : s.gridPriceCents >= 40 ? 0 : (40 - s.gridPriceCents) / 30;
  // Bonus: exporting to grid
  const exportBonus = s.solarW > s.loadW ? Math.min(5, ((s.solarW - s.loadW) / s.loadW) * 10) : 0;
  return Math.round(clamp(coverage * 48 + battery * 28 + tariff * 20 + exportBonus));
}

export function bioScore(s: InstallationState["bio"]) {
  const hrPenalty  = s.hr > 100 ? (s.hr - 100) * 1.2 : s.hr < 50 ? (50 - s.hr) * 1.2 : 0;
  const hrvBonus   = s.hrv > 60 ? Math.min(5, (s.hrv - 60) * 0.2) : 0;
  const hrvPenalty = s.hrv < 40 ? (40 - s.hrv) * 1.5 : 0;
  const stress     = clamp(s.stress, 0, 100);
  return Math.round(clamp(100 - hrPenalty + hrvBonus - hrvPenalty - stress * 0.4));
}

export function envScore(s: InstallationState["env"]) {
  // Temperature: comfort zone 20-24°C
  const temp = s.tempC < 18 ? 60 - (18 - s.tempC) * 4
             : s.tempC > 26 ? 60 - (s.tempC - 26) * 4
             : s.tempC >= 20 && s.tempC <= 24 ? 100 : 85;
  const hum  = s.humidity < 30 ? 70 - (30 - s.humidity) * 1.5
             : s.humidity > 60 ? 70 - (s.humidity - 60) * 1.5
             : 100;
  const co2  = s.co2Ppm > 2000 ? 20 : s.co2Ppm > 1500 ? 35 : s.co2Ppm > 1000 ? 65 : s.co2Ppm > 800 ? 85 : 100;
  const pm   = s.pm25 > 55 ? 10 : s.pm25 > 35 ? 35 : s.pm25 > 15 ? 70 : s.pm25 > 8 ? 88 : 100;
  return Math.round(clamp((temp + hum + co2 + pm) / 4));
}

// ── Trend detection ──────────────────────────────────────────────────────────

export type Trend = "improving" | "stable" | "degrading";

export function detectTrend(history: number[]): Trend {
  if (history.length < 3) return "stable";
  const recent = history.slice(-5);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  recent.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;
  if (slope >  1.5) return "improving";
  if (slope < -1.5) return "degrading";
  return "stable";
}

// ── Mode weights ─────────────────────────────────────────────────────────────

const WEIGHTS: Record<Mode, [number, number, number]> = {
  energy_guardian:   [0.60, 0.15, 0.25],
  health_sentinel:   [0.15, 0.60, 0.25],
  habitat_optimizer: [0.33, 0.33, 0.34],
};

// ── Predictive score (next ~30 min estimate) ─────────────────────────────────

export function predictNextScore(state: InstallationState, mode: Mode, recentScores: number[]): number {
  const current = computeScore(state, mode);
  const trend = detectTrend(recentScores);
  const delta = trend === "improving" ? 3 : trend === "degrading" ? -3 : 0;
  return Math.round(clamp(current.score + delta));
}

// ── Signals ──────────────────────────────────────────────────────────────────

export function deriveSignals(s: InstallationState, mode: Mode): Signal[] {
  const out: Signal[] = [];

  // Energy signals
  if (s.energy.gridPriceCents >= 35 && s.energy.batterySoc < 30)
    out.push({ kind: "energy.peak_tariff_low_battery", severity: "alert",
      message: "Peak tariff with low battery reserve",
      recommendation: "Delay high-draw appliances for ~90 min; consider grid charge" });

  if (s.energy.gridPriceCents >= 35 && s.energy.batterySoc >= 30)
    out.push({ kind: "energy.peak_tariff", severity: "warn",
      message: `Peak tariff active (${s.energy.gridPriceCents}¢/kWh)`,
      recommendation: "Delay non-essential loads 60-90 min" });

  if (mode === "energy_guardian" && s.energy.solarW > s.energy.loadW * 1.3 && s.energy.batterySoc < 90)
    out.push({ kind: "energy.solar_surplus", severity: "info",
      message: `Solar surplus: ${Math.round(s.energy.solarW - s.energy.loadW)}W available`,
      recommendation: "Pre-cool habitat / charge EVs / run dishwasher now" });

  if (s.energy.batterySoc < 15)
    out.push({ kind: "energy.battery_critical", severity: "alert",
      message: `Battery critically low (${s.energy.batterySoc.toFixed(1)}%)`,
      recommendation: "Enable grid charge immediately" });

  // Bio signals
  if (s.bio.stress >= 70)
    out.push({ kind: "bio.high_strain", severity: "alert",
      message: `Sustained high stress detected (${Math.round(s.bio.stress)}/100) — non-medical`,
      recommendation: "Dim lights to 30%, lower setpoint 1°C, suggest 5-min break" });

  if (s.bio.hrv < 30 && mode === "health_sentinel")
    out.push({ kind: "bio.low_hrv", severity: "warn",
      message: `Low HRV (${Math.round(s.bio.hrv)} ms) — recovery may be impaired`,
      recommendation: "Reduce screen time, ensure fresh air, prioritise sleep" });

  if (s.bio.hr > 100 && s.bio.stress > 50)
    out.push({ kind: "bio.elevated_hr_stress", severity: "warn",
      message: `Elevated HR (${Math.round(s.bio.hr)} bpm) with high stress — non-medical`,
      recommendation: "Take a break; Aurora is dimming lights automatically" });

  // Environment signals
  if (s.env.co2Ppm > 2000)
    out.push({ kind: "env.co2_critical", severity: "alert",
      message: `CO₂ critical: ${Math.round(s.env.co2Ppm)} ppm`,
      recommendation: "Open windows immediately; running ventilation at max" });

  if (s.env.co2Ppm > 1500)
    out.push({ kind: "env.co2_high", severity: "alert",
      message: `CO₂ elevated: ${Math.round(s.env.co2Ppm)} ppm`,
      recommendation: "Increase ventilation — running HVAC fan" });

  if (s.env.co2Ppm > 1000 && s.env.co2Ppm <= 1500)
    out.push({ kind: "env.co2_moderate", severity: "warn",
      message: `CO₂ rising: ${Math.round(s.env.co2Ppm)} ppm`,
      recommendation: "Increase air exchange rate" });

  if (s.env.pm25 > 55)
    out.push({ kind: "env.pm25_hazardous", severity: "alert",
      message: `PM2.5 hazardous: ${s.env.pm25.toFixed(1)} µg/m³`,
      recommendation: "Stay indoors, running air purifier at max" });

  if (s.env.pm25 > 35)
    out.push({ kind: "env.pm25_elevated", severity: "warn",
      message: `PM2.5 elevated: ${s.env.pm25.toFixed(1)} µg/m³`,
      recommendation: "Run air purifier" });

  if (s.env.tempC > 28)
    out.push({ kind: "env.temp_high", severity: "warn",
      message: `Temperature high: ${s.env.tempC.toFixed(1)}°C`,
      recommendation: "Lower HVAC setpoint; check insulation" });

  if (s.env.tempC < 17)
    out.push({ kind: "env.temp_low", severity: "warn",
      message: `Temperature low: ${s.env.tempC.toFixed(1)}°C`,
      recommendation: "Raise heating setpoint" });

  if (s.env.humidity > 70)
    out.push({ kind: "env.humidity_high", severity: "warn",
      message: `Humidity high: ${Math.round(s.env.humidity)}%`,
      recommendation: "Enable dehumidifier or increase ventilation (mould risk)" });

  return out;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export function deriveActions(s: InstallationState, mode: Mode) {
  const acts: DecisionResult["actions"] = [];

  // Critical environment — always act regardless of mode
  if (s.env.co2Ppm > 2000)
    acts.push({ deviceKind: "hvac", command: "set_ventilation", args: { level: "max" },     reason: "co2_critical" });
  else if (s.env.co2Ppm > 1500)
    acts.push({ deviceKind: "hvac", command: "set_ventilation", args: { level: "high" },    reason: "co2_high" });

  if (s.env.pm25 > 55)
    acts.push({ deviceKind: "hvac", command: "set_purifier",    args: { on: true, speed: "max" }, reason: "pm25_hazardous" });
  else if (s.env.pm25 > 35)
    acts.push({ deviceKind: "hvac", command: "set_purifier",    args: { on: true },               reason: "pm25_elevated" });

  // Bio — always dim lights on strain
  if (s.bio.stress >= 70)
    acts.push({ deviceKind: "light", command: "dim",            args: { level: 30, kelvin: 2700 }, reason: "bio_strain" });

  if (s.env.tempC > 28)
    acts.push({ deviceKind: "hvac", command: "set_setpoint",    args: { tempC: 24 },              reason: "temp_high" });
  if (s.env.tempC < 17)
    acts.push({ deviceKind: "hvac", command: "set_setpoint",    args: { tempC: 20 },              reason: "temp_low" });

  // Energy — mode-gated actions
  if (mode === "energy_guardian") {
    if (s.energy.gridPriceCents >= 35)
      acts.push({ deviceKind: "turnbot", command: "delay_load",  args: { minutes: 90 },           reason: "peak_tariff" });
    if (s.energy.solarW > s.energy.loadW * 1.5 && s.energy.batterySoc < 80)
      acts.push({ deviceKind: "battery", command: "charge",      args: { rate: "solar_only" },     reason: "solar_surplus" });
  }

  if (s.energy.batterySoc < 15)
    acts.push({ deviceKind: "battery", command: "charge",        args: { rate: "emergency" },      reason: "battery_critical" });

  return acts;
}

// ── Core decision ────────────────────────────────────────────────────────────

function computeScore(state: InstallationState, mode: Mode) {
  const e = energyScore(state.energy);
  const b = bioScore(state.bio);
  const v = envScore(state.env);
  const [we, wb, wv] = WEIGHTS[mode];
  return {
    score: Math.round(clamp(e * we + b * wb + v * wv)),
    breakdown: { energy: e, biometric: b, environment: v, mode } as ScoreBreakdown,
  };
}

export function decide(
  state: InstallationState,
  mode: Mode,
  recentScores: number[] = []
): DecisionResult {
  const { score, breakdown } = computeScore(state, mode);
  const trend = detectTrend(recentScores);
  const predictedScore = predictNextScore(state, mode, recentScores);

  return {
    score,
    breakdown,
    signals:        deriveSignals(state, mode),
    actions:        deriveActions(state, mode),
    trend,
    predictedScore,
  };
}
