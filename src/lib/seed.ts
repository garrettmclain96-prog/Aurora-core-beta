// ─── System Power History (24h, 15-min intervals) ─────────────────────────
export const powerHistory = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const solar = h >= 7 && h <= 19 ? Math.max(0, 4.2 * Math.sin(((h - 7) / 12) * Math.PI) + (Math.random() - 0.5) * 0.4) : 0
  const load  = 2.1 + Math.sin(i / 15) * 0.9 + (Math.random() - 0.5) * 0.3
  const grid  = Math.max(0, load - solar)
  return { label, solar: +solar.toFixed(2), load: +load.toFixed(2), grid: +grid.toFixed(2) }
})

// ─── Battery ───────────────────────────────────────────────────────────────
export const battery = {
  soc: 74,   // state of charge %
  soh: 96,   // state of health %
  voltage: 52.3,
  current: -8.4,  // negative = discharging
  temp: 29.1,
  capacity: 14.4, // kWh
  cycles: 142,
}

export const batterySocHistory = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  soc: Math.min(100, Math.max(20, 74 + Math.sin((i - 12) / 4) * 22 + (Math.random() - 0.5) * 5)),
}))

// ─── Circuits ──────────────────────────────────────────────────────────────
export type Circuit = {
  id: string; name: string; phase: string
  current: number; voltage: number; power: number
  limit: number; status: 'on' | 'off' | 'tripped'
  critical: boolean
}
export const circuits: Circuit[] = [
  { id: 'C1', name: 'Main Panel',      phase: 'L1+L2', current: 38.2, voltage: 240, power: 9168,  limit: 100, status: 'on', critical: true  },
  { id: 'C2', name: 'HVAC System',     phase: 'L1+L2', current: 18.5, voltage: 240, power: 4440,  limit:  40, status: 'on', critical: true  },
  { id: 'C3', name: 'EV Charger',      phase: 'L1',    current: 14.4, voltage: 120, power: 1728,  limit:  30, status: 'on', critical: true  },
  { id: 'C4', name: 'Kitchen',         phase: 'L2',    current:  8.2, voltage: 120, power:  984,  limit:  20, status: 'on', critical: false },
  { id: 'C5', name: 'Lighting',        phase: 'L1',    current:  2.1, voltage: 120, power:  252,  limit:  15, status: 'on', critical: false },
  { id: 'C6', name: 'Water Heater',    phase: 'L1+L2', current: 12.5, voltage: 240, power: 3000,  limit:  30, status: 'off', critical: false },
]

// ─── TurnBot Devices ───────────────────────────────────────────────────────
export type TurnBotDevice = {
  id: string; name: string; type: 'mini' | 'pro' | 'hub'
  position: number; torque: number; maxTorque: number
  battery: number; firmware: string; online: boolean
  protocol: string; lastSeen: string; zone: string
}
export const devices: TurnBotDevice[] = [
  { id: 'TB-001', name: 'TurnBot Mini',  type: 'mini', position: 67,  torque: 3.2,  maxTorque: 5,  battery: 82, firmware: '2.4.1', online: true,  protocol: 'BLE 5.3',       lastSeen: '2s ago',  zone: 'HVAC Zone A'   },
  { id: 'TB-002', name: 'TurnBot Pro',   type: 'pro',  position: 100, torque: 18.7, maxTorque: 25, battery: 0,  firmware: '3.1.0', online: true,  protocol: 'Matter 1.5',    lastSeen: 'Live',    zone: 'Main Shutoff'  },
  { id: 'TB-003', name: 'TurnBot Hub',   type: 'hub',  position: 0,   torque: 0,    maxTorque: 0,  battery: 0,  firmware: '3.2.0', online: true,  protocol: 'ESP32-C6 Mesh', lastSeen: 'Live',    zone: 'Network Core'  },
]

// ─── AI Agents ─────────────────────────────────────────────────────────────
export type Agent = {
  id: string; name: string; domain: string; icon: string
  action: string; confidence: number; conflicts: number
  status: 'active' | 'idle' | 'conflict'
  metrics: { label: string; value: string; unit: string }[]
  color: string
}
export const agents: Agent[] = [
  {
    id: 'health', name: 'Health Agent', domain: 'Biometrics', icon: '❤️',
    action: 'Monitoring HRV — stress index: LOW',
    confidence: 94, conflicts: 0, status: 'active', color: '#ef4444',
    metrics: [
      { label: 'HR',    value: '62',   unit: 'bpm'  },
      { label: 'HRV',   value: '48',   unit: 'ms'   },
      { label: 'SpO₂',  value: '98.2', unit: '%'    },
      { label: 'Stress',value: '18',   unit: '/100' },
    ],
  },
  {
    id: 'energy', name: 'Energy Agent', domain: 'Power', icon: '⚡',
    action: 'Peak shave active — saving $0.18/hr',
    confidence: 88, conflicts: 1, status: 'conflict', color: '#f59e0b',
    metrics: [
      { label: 'Load',   value: '9.17', unit: 'kW'  },
      { label: 'Solar',  value: '3.42', unit: 'kW'  },
      { label: 'Battery',value: '74',   unit: '%'   },
      { label: 'Savings',value: '$4.32',unit: '/day' },
    ],
  },
  {
    id: 'behavior', name: 'Behavior Agent', domain: 'Routines', icon: '🧠',
    action: 'Learned: 06:15 wake preference',
    confidence: 91, conflicts: 0, status: 'active', color: '#8b5cf6',
    metrics: [
      { label: 'Patterns', value: '24',  unit: 'learned' },
      { label: 'Accuracy', value: '91',  unit: '%'       },
      { label: 'Next evt', value: '2.3', unit: 'hrs'     },
      { label: 'Comfort',  value: '96',  unit: '/100'    },
    ],
  },
  {
    id: 'env', name: 'Environment Agent', domain: 'Ambient', icon: '🌡️',
    action: 'CO₂ nominal — adjusting ventilation',
    confidence: 97, conflicts: 0, status: 'active', color: '#10b981',
    metrics: [
      { label: 'CO₂',   value: '612',  unit: 'ppm'  },
      { label: 'PM2.5', value: '8',    unit: 'μg/m³'},
      { label: 'Temp',  value: '72.4', unit: '°F'   },
      { label: 'Humid', value: '48',   unit: '%RH'  },
    ],
  },
]

// ─── Cognitive Layers ──────────────────────────────────────────────────────
export const layers = [
  { id: 1, name: 'Bio Ingestion',          abbr: 'L1 · BIO',      status: 'active',  throughput: '842 msg/s', color: '#10b981', desc: 'Ingests biometric and environmental signals from wearables, sensors, weather APIs, and smart meters. Handles Bluetooth HRM, Apple Health, Fitbit, Garmin, OpenWeatherMap, and utility AMI streams.', caps: ['HR/HRV streaming','SpO₂ sampling','Weather correlation','Smart meter AMI'] },
  { id: 2, name: 'Signal Normalization',   abbr: 'L2 · INGEST',   status: 'active',  throughput: '798 msg/s', color: '#00d4ff', desc: 'Normalizes and time-aligns multi-rate sensor streams across heterogeneous sources. Resamples to common 1-second epochs, applies Kalman filtering, and detects sensor drift.', caps: ['Multi-rate alignment','Kalman filtering','Drift detection','Gap interpolation'] },
  { id: 3, name: 'Cognitive Core',         abbr: 'L3 · CORE',     status: 'conflict',throughput: '4 agents',  color: '#f59e0b', desc: 'Four specialized AI agents share weighted state vectors across a consensus bus. Conflicts are resolved by priority weighting (health > safety > comfort > efficiency).', caps: ['Consensus arbitration','Priority weighting','State sharing','Conflict resolution'] },
  { id: 4, name: 'Predictive Simulation',  abbr: 'L4 · PRED',     status: 'active',  throughput: '12k sim/s', color: '#8b5cf6', desc: 'Monte Carlo simulation and Temporal Fusion Transformer for multi-horizon energy and health forecasting. Generates probabilistic outcome distributions across 1h, 6h, 24h, and 7d windows.', caps: ['Monte Carlo simulation','TFT forecasting','Uncertainty quantification','Multi-horizon planning'] },
  { id: 5, name: 'Decision Orchestration', abbr: 'L5 · DECISION',  status: 'active',  throughput: '240 dec/s', color: '#00d4ff', desc: 'Priority-weighted decision orchestration with constraint satisfaction and real-time preference learning. Balances competing agent goals while respecting hard constraints (budget, comfort, safety).', caps: ['Constraint satisfaction','Preference learning','Goal balancing','Action sequencing'] },
  { id: 6, name: 'Physical Execution',     abbr: 'L6 · EXEC',     status: 'active',  throughput: '32 devices',color: '#10b981', desc: 'Matter 1.5 / Thread / BLE 5.3 device control via TurnBot actuator network. Sends OpenADR 2.0b demand response signals and manages TurnBot Hub mesh with up to 32 nodes.', caps: ['Matter 1.5 / Thread','BLE 5.3 actuators','OpenADR 2.0b DR','OTA firmware updates'] },
  { id: 7, name: 'Optimization Loop',      abbr: 'L7 · OPTIM',    status: 'active',  throughput: '∞ retrain', color: '#8b5cf6', desc: 'Continuous model retraining, drift detection, and A/B strategy evaluation. Monitors outcome deltas, triggers retraining when prediction error exceeds threshold, and evaluates strategy variants in shadow mode.', caps: ['Drift detection','Auto-retraining','A/B strategy eval','Outcome tracking'] },
]

// ─── Simulation Scenarios ──────────────────────────────────────────────────
export const scenarios = [
  {
    id: 'peak-shave', name: 'Peak Shave', probability: 87, savings: '$4.20', co2: '-2.1 kg',
    color: '#00d4ff',
    radar: [
      { metric: 'Savings',   value: 87 }, { metric: 'Comfort',  value: 74 },
      { metric: 'Efficiency',value: 92 }, { metric: 'Health',   value: 68 },
      { metric: 'Battery',   value: 61 }, { metric: 'Grid Rel', value: 45 },
    ],
    desc: 'Shift 2.1 kW of flexible load off peak hours using battery buffer. Highest financial return.',
  },
  {
    id: 'grid-response', name: 'Grid Response', probability: 72, savings: '$2.80', co2: '-3.4 kg',
    color: '#8b5cf6',
    radar: [
      { metric: 'Savings',   value: 72 }, { metric: 'Comfort',  value: 61 },
      { metric: 'Efficiency',value: 84 }, { metric: 'Health',   value: 55 },
      { metric: 'Battery',   value: 82 }, { metric: 'Grid Rel', value: 92 },
    ],
    desc: 'Respond to utility DR event. Reduces grid strain and earns demand response credit.',
  },
  {
    id: 'wellness', name: 'Wellness Priority', probability: 93, savings: '$1.40', co2: '-0.8 kg',
    color: '#10b981',
    radar: [
      { metric: 'Savings',   value: 45 }, { metric: 'Comfort',  value: 96 },
      { metric: 'Efficiency',value: 68 }, { metric: 'Health',   value: 98 },
      { metric: 'Battery',   value: 44 }, { metric: 'Grid Rel', value: 38 },
    ],
    desc: 'Optimize HVAC and lighting to match HRV / sleep data. Prioritizes health outcomes.',
  },
]

// ─── Alerts ────────────────────────────────────────────────────────────────
export type Alert = {
  id: string; type: 'warning' | 'info' | 'error' | 'success'
  title: string; message: string; time: string; resolved: boolean
  agent: string
}
export const initialAlerts: Alert[] = [
  { id: 'A1', type: 'warning', title: 'Energy Agent Conflict',     message: 'Energy Agent recommendation conflicts with Behavior Agent schedule at 18:00. Priority arbitration applied.',             time: '4m ago',  resolved: false, agent: 'energy'   },
  { id: 'A2', type: 'info',    title: 'Peak Shave Active',         message: 'Load shifting in effect. 2.1 kW transferred to battery buffer. Estimated savings: $0.18/hr.',                           time: '12m ago', resolved: false, agent: 'energy'   },
  { id: 'A3', type: 'success', title: 'L7 Retraining Complete',    message: 'Optimization loop retrained energy prediction model. RMSE improved from 0.34 to 0.28 kWh.',                            time: '1h ago',  resolved: false, agent: 'system'   },
  { id: 'A4', type: 'info',    title: 'Behavior Pattern Learned',  message: 'Behavior Agent recorded new preference: occupancy window 06:15–22:45. Comfort model updated.',                         time: '3h ago',  resolved: true,  agent: 'behavior' },
  { id: 'A5', type: 'warning', title: 'CO₂ Threshold Approach',    message: 'CO₂ reading at 612 ppm, approaching 700 ppm advisory threshold. Ventilation rate increased 15%.',                      time: '5h ago',  resolved: true,  agent: 'env'      },
  { id: 'A6', type: 'error',   title: 'Circuit C6 Tripped',        message: 'Water Heater circuit (C6) was manually switched off. Manual override recorded in audit log.',                          time: '8h ago',  resolved: true,  agent: 'system'   },
]
