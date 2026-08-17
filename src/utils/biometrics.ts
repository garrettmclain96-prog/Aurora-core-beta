/**
 * Aurora Core — Biometric Utility Functions
 * Pure functions for health scoring, HRV analysis, and stress assessment.
 */

import type { BiometricReading } from '../types'

/**
 * Calculate overall wellness score from biometric readings.
 * Weighted composite: HRV (40%) + Stress inverse (40%) + SpO2 (20%)
 * @returns score 0–100
 */
export function calcWellnessScore(reading: BiometricReading): number {
  const hrvScore    = Math.min(100, (reading.hrv / 80) * 100) * 0.40
  const stressScore = (1 - reading.stress / 100) * 100 * 0.40
  const spo2Score   = Math.max(0, (reading.spo2 - 90) / 10 * 100) * 0.20
  return Math.round(hrvScore + stressScore + spo2Score)
}

/**
 * Classify HRV into a health category.
 * Based on age-adjusted population norms.
 */
export function classifyHRV(hrv: number): { label: string; color: string } {
  if (hrv >= 60) return { label: 'Excellent', color: '#39ff14' }
  if (hrv >= 45) return { label: 'Good',      color: '#00ffc8' }
  if (hrv >= 30) return { label: 'Fair',       color: '#ffd60a' }
  return              { label: 'Low',          color: '#ff3366' }
}

/**
 * Classify stress index into readable level.
 */
export function classifyStress(stress: number): { label: string; color: string } {
  if (stress < 25) return { label: 'LOW',    color: '#39ff14' }
  if (stress < 50) return { label: 'MEDIUM', color: '#ffd60a' }
  if (stress < 75) return { label: 'HIGH',   color: '#ff6b35' }
  return               { label: 'CRITICAL', color: '#ff3366' }
}

/**
 * Determine if a breathing exercise should be recommended.
 * Triggers when: stress > 40 AND hrv < 40 AND hour is evening.
 */
export function shouldRecommendBreathing(reading: BiometricReading): boolean {
  const hour = new Date().getHours()
  const isEvening = hour >= 18 && hour <= 22
  return reading.stress > 40 && reading.hrv < 40 && isEvening
}

/**
 * Calculate biometric sub-score for the System Health Gauge.
 */
export function calcBioScore(hrv: number, stress: number): number {
  return Math.round((hrv / 60) * 40 + (1 - stress / 100) * 60)
}

/**
 * Calculate energy sub-score for the System Health Gauge.
 */
export function calcEnergyScore(batterySoc: number, solar: number): number {
  return Math.round((batterySoc / 100) * 50 + (solar / 5) * 50)
}

/**
 * Calculate environment sub-score for the System Health Gauge.
 */
export function calcEnvScore(co2: number): number {
  return Math.round(Math.max(0, 100 - (co2 - 400) / 3))
}

/**
 * Calculate composite system health score from all domains.
 */
export function calcSystemScore(
  hrv: number, stress: number, batterySoc: number, solar: number, co2: number
): number {
  const bio    = calcBioScore(hrv, stress)
  const energy = calcEnergyScore(batterySoc, solar)
  const env    = calcEnvScore(co2)
  return Math.round(bio * 0.4 + energy * 0.35 + env * 0.25)
}
