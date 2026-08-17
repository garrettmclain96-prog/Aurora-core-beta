/**
 * Aurora Core — Energy Utility Functions
 * Pure calculation functions for energy math.
 * No side effects. All testable with Jest.
 */

import type { PowerSnapshot, Circuit } from '../types'

/** kWh grid emission factor (US average, lbs CO₂/kWh) */
const GRID_EMISSION_FACTOR_LBS = 0.92
/** Retail electricity price assumption ($/kWh) */
const ELECTRICITY_PRICE_USD = 0.14

/**
 * Calculate daily CO₂ avoided by solar generation.
 * @param solarKw - current solar output in kW
 * @param hoursToday - solar hours so far today
 * @returns CO₂ avoided in kg
 */
export function calcCO2Avoided(solarKw: number, hoursToday = 6): number {
  const kwhGenerated = solarKw * hoursToday
  const lbsAvoided   = kwhGenerated * GRID_EMISSION_FACTOR_LBS
  return +(lbsAvoided * 0.453592).toFixed(2) // convert to kg
}

/**
 * Calculate estimated daily energy savings vs grid-only baseline.
 * @param solarKw - current solar output in kW
 * @param hoursToday - solar hours so far today
 * @returns savings in USD
 */
export function calcEnergySavings(solarKw: number, hoursToday = 6): number {
  return +(solarKw * hoursToday * ELECTRICITY_PRICE_USD).toFixed(2)
}

/**
 * Calculate solar self-sufficiency percentage.
 * @param solar - solar generation in kW
 * @param load  - total home load in kW
 * @returns percentage 0–100
 */
export function calcSelfSufficiency(solar: number, load: number): number {
  if (load <= 0) return 0
  return Math.min(100, Math.round((solar / load) * 100))
}

/**
 * Calculate total active load across all circuits.
 * @param circuits - array of circuit objects
 * @returns total load in kW
 */
export function calcTotalLoad(circuits: Circuit[]): number {
  const watts = circuits
    .filter(c => c.status === 'on')
    .reduce((sum, c) => sum + c.power, 0)
  return +(watts / 1000).toFixed(2)
}

/**
 * Calculate circuit load percentage vs breaker rating.
 * @param circuit - circuit object
 * @returns load percentage 0–100+
 */
export function calcCircuitLoadPct(circuit: Circuit): number {
  return +((circuit.power / (circuit.limit * circuit.voltage)) * 100).toFixed(1)
}

/**
 * Estimate battery runtime at current discharge rate.
 * @param socPct      - state of charge percentage
 * @param capacityKwh - battery capacity in kWh
 * @param loadKw      - current load in kW (net of solar)
 * @returns estimated hours remaining
 */
export function calcBatteryRuntime(socPct: number, capacityKwh: number, loadKw: number): number {
  if (loadKw <= 0) return Infinity
  const storedKwh = (socPct / 100) * capacityKwh
  return +(storedKwh / loadKw).toFixed(1)
}

/**
 * Determine if peak shave is currently active.
 * Peak shave = battery discharging during grid peak hours.
 */
export function isPeakShaveActive(snapshot: PowerSnapshot): boolean {
  const hour = new Date().getHours()
  const isPeakHour = hour >= 16 && hour <= 20 // typical TOU peak
  return isPeakHour && snapshot.batteryCurrent < -2
}
