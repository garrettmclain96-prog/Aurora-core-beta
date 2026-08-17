/**
 * Aurora Core — Type Definitions
 * Central source of truth for all data shapes across the platform.
 * Every agent, metric, device, and event is typed here.
 */

// ─── Biometric / Health ────────────────────────────────────────────────────

/** Real-time biometric readings from wearables / sensors */
export interface BiometricReading {
  heartRate: number        // bpm
  hrv: number              // ms — heart rate variability
  spo2: number             // % — blood oxygen saturation
  stress: number           // 0–100 index
  respirationRate: number  // breaths/min
  sleepQuality: number     // 0–100 score
  coreTemp: number         // °F
}

// ─── Energy ────────────────────────────────────────────────────────────────

/** Instantaneous power flow snapshot */
export interface PowerSnapshot {
  load: number           // kW — total home load
  solar: number          // kW — solar generation
  grid: number           // kW — grid draw (negative = export)
  batteryCurrent: number // A  — negative = discharging
  batterySoc: number     // %  — state of charge
  batterySoh: number     // %  — state of health
  timestamp: number      // ms epoch
}

/** Historical power data point for charting */
export interface PowerHistoryPoint {
  label: string
  solar: number
  load: number
  grid: number
}

export type BatteryDispatchMode = 'auto' | 'charge' | 'discharge' | 'hold'

/** Full battery pack state */
export interface BatteryState {
  soc: number           // % state of charge
  soh: number           // % state of health
  voltage: number       // V
  current: number       // A
  temp: number          // °C
  capacity: number      // kWh
  cycles: number        // lifetime cycle count
  mode: BatteryDispatchMode
}

// ─── Environment ───────────────────────────────────────────────────────────

export interface EnvironmentReading {
  co2: number          // ppm
  pm25: number         // μg/m³
  temp: number         // °F
  humidity: number     // %RH
  voc: number          // ppb — volatile organic compounds
  ambientLight: number // lux
}

// ─── Circuits ──────────────────────────────────────────────────────────────

export type CircuitStatus = 'on' | 'off' | 'tripped'

export interface Circuit {
  id: string
  name: string
  phase: string
  current: number   // A
  voltage: number   // V
  power: number     // W
  limit: number     // A — breaker rating
  status: CircuitStatus
  critical: boolean
}

// ─── TurnBot Hardware ──────────────────────────────────────────────────────

export type TurnBotType = 'mini' | 'pro' | 'hub'

export interface TurnBotDevice {
  id: string
  name: string
  type: TurnBotType
  position: number     // degrees 0–360
  torque: number       // Nm
  maxTorque: number    // Nm
  battery: number      // % (0 for wired)
  firmware: string
  online: boolean
  protocol: string
  lastSeen: string
  zone: string
}

// ─── AI Agents ─────────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'conflict' | 'error'
export type AgentId = 'health' | 'energy' | 'behavior' | 'environment'

export interface AgentMetric {
  label: string
  value: string
  unit: string
}

export interface Agent {
  id: AgentId
  name: string
  domain: string
  icon: string
  action: string         // current decision / action description
  confidence: number     // 0–100 model confidence
  conflicts: number      // unresolved conflicts count
  status: AgentStatus
  metrics: AgentMetric[]
  color: string
}

/** Result returned from querying an agent via the AI API */
export interface AgentQueryResult {
  agentId: AgentId
  response: string
  timestamp: number
  tokensUsed?: number
}

// ─── Cognitive Layers ──────────────────────────────────────────────────────

export type LayerStatus = 'active' | 'idle' | 'conflict' | 'error'

export interface CognitiveLayer {
  id: number            // 1–7
  name: string
  abbr: string
  status: LayerStatus
  throughput: string
  color: string
  desc: string
  caps: string[]        // capability tags
}

// ─── Simulation / Prediction ───────────────────────────────────────────────

export interface RadarDataPoint {
  metric: string
  value: number         // 0–100
}

export interface SimulationScenario {
  id: string
  name: string
  probability: number   // 0–100 Monte Carlo success %
  savings: string       // formatted savings per day
  co2: string           // formatted CO₂ delta
  color: string
  radar: RadarDataPoint[]
  desc: string
}

// ─── Alerts ────────────────────────────────────────────────────────────────

export type AlertType = 'warning' | 'info' | 'error' | 'success'

export interface SystemAlert {
  id: string
  type: AlertType
  title: string
  message: string
  time: string
  resolved: boolean
  agent: string         // which agent/subsystem generated it
}

// ─── Live Metrics (aggregated from all sensors) ────────────────────────────

/**
 * LiveMetrics is the single unified state object passed to all
 * dashboard panels. It combines biometric, power, and environmental
 * readings into one live-updating payload.
 */
export interface LiveMetrics {
  // Power
  load: number
  solar: number
  grid: number
  batterySoc: number
  batteryCurrent: number
  // Biometrics
  heartRate: number
  hrv: number
  spo2: number
  stress: number
  // Environment
  co2: number
  temp: number
  humidity: number
  pm25: number
  // Composite
  systemScore: number   // 0–100 overall health score
  tick: number          // increments each update cycle
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = 'god' | 'admin' | 'viewer'

export interface AuroraUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  joinedAt: string      // ISO date string YYYY-MM-DD
}

// ─── Integrations ──────────────────────────────────────────────────────────

export type IntegrationStatus = 'connected' | 'available' | 'coming_soon'

export interface Integration {
  id: string
  name: string
  category: string
  description: string
  status: IntegrationStatus
  color: string
  emoji: string
  features: string[]
}

// ─── API ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ApiError {
  error: string
  status?: number
}
