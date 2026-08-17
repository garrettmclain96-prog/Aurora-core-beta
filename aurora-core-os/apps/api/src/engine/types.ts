export type Domain = "ENERGY" | "BIOMETRIC" | "ENVIRONMENT";
export type Mode   = "energy_guardian" | "health_sentinel" | "habitat_optimizer";
export type Trend  = "improving" | "stable" | "degrading";

export interface EnergyState {
  loadW: number; solarW: number; batterySoc: number; gridPriceCents: number;
}
export interface BioState {
  hr: number; hrv: number; stress: number; // 0-100
}
export interface EnvState {
  tempC: number; humidity: number; co2Ppm: number; pm25: number;
}
export interface InstallationState {
  energy: EnergyState; bio: BioState; env: EnvState;
  updatedAt: number;
}

export interface Signal {
  kind:     string;
  severity: "info" | "warn" | "alert";
  message:  string;
  recommendation?: string;
}

export interface ScoreBreakdown {
  energy: number; biometric: number; environment: number; mode: Mode;
}

export interface DecisionResult {
  score:          number;
  breakdown:      ScoreBreakdown;
  signals:        Signal[];
  actions:        Array<{ deviceKind: string; command: string; args?: any; reason: string }>;
  trend:          Trend;
  predictedScore: number;
}
