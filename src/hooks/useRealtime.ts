/**
 * useRealtime — live sensor state.
 * Primary: polls /api/ingest for real ESP32 telemetry every 3s.
 * Fallback: simulation when no hardware connected.
 * Never surfaces the difference to consumers — same LiveMetrics shape either way.
 */
import { useState, useEffect, useRef } from 'react'
import type { LiveMetrics } from '../types'

const SIM_BASE: LiveMetrics = {
  tick: 0, systemScore: 78,
  solar: 2.4, load: 1.8, grid: 0.2, batterySoc: 74, batteryCurrent: 8.4,
  heartRate: 68, hrv: 52, spo2: 98, stress: 22,
  temp: 72, humidity: 47, co2: 640, pm25: 7,
}

function jitter(base: number, pct = 0.04): number {
  return +(base * (1 + (Math.random() - 0.5) * pct)).toFixed(2)
}

function simTick(prev: LiveMetrics): LiveMetrics {
  const t = Date.now() / 1000
  return {
    ...prev,
    tick:          prev.tick + 1,
    solar:         +Math.max(0, 2.4 + Math.sin(t * 0.03) * 1.2 + (Math.random() - 0.5) * 0.15).toFixed(2),
    load:          jitter(prev.load, 0.06),
    grid:          +Math.max(0, prev.grid + (Math.random() - 0.5) * 0.08).toFixed(2),
    batterySoc:    +Math.min(100, Math.max(0, prev.batterySoc + (Math.random() - 0.49) * 0.12)).toFixed(1),
    batteryCurrent:jitter(prev.batteryCurrent, 0.05),
    heartRate:     Math.round(prev.heartRate + (Math.random() - 0.5) * 2),
    hrv:           +Math.max(20, Math.min(90, prev.hrv + (Math.random() - 0.5) * 1.5)).toFixed(1),
    spo2:          +Math.min(100, Math.max(92, prev.spo2 + (Math.random() - 0.5) * 0.2)).toFixed(1),
    stress:        +Math.max(0, Math.min(100, prev.stress + (Math.random() - 0.48) * 1.8)).toFixed(1),
    temp:          +Math.max(60, Math.min(90, prev.temp + (Math.random() - 0.5) * 0.3)).toFixed(1),
    humidity:      +Math.max(20, Math.min(80, prev.humidity + (Math.random() - 0.5) * 0.4)).toFixed(1),
    co2:           Math.round(Math.max(400, Math.min(2000, prev.co2 + (Math.random() - 0.48) * 8))),
    pm25:          +Math.max(1, Math.min(75, prev.pm25 + (Math.random() - 0.5) * 0.5)).toFixed(1),
  }
}

interface IngestSnapshot {
  solar_w?: number; load_w?: number; batt_soc?: number; batt_a?: number
  grid_w?: number; temp_f?: number; humidity?: number; co2_ppm?: number
  pm25?: number; hr_bpm?: number; hrv_ms?: number; spo2?: number; stress?: number
}

function snapshotToMetrics(snap: IngestSnapshot, prev: LiveMetrics, tick: number): LiveMetrics {
  const solarKw  = snap.solar_w  != null ? +(snap.solar_w  / 1000).toFixed(2) : prev.solar
  const loadKw   = snap.load_w   != null ? +(snap.load_w   / 1000).toFixed(2) : prev.load
  const gridKw   = snap.grid_w   != null ? +(snap.grid_w   / 1000).toFixed(2) : prev.grid
  return {
    tick,
    solar:          solarKw,
    load:           loadKw,
    grid:           gridKw,
    batterySoc:     snap.batt_soc  ?? prev.batterySoc,
    batteryCurrent: snap.batt_a    ?? prev.batteryCurrent,
    heartRate:      snap.hr_bpm    ?? prev.heartRate,
    hrv:            snap.hrv_ms    ?? prev.hrv,
    spo2:           snap.spo2      ?? prev.spo2,
    stress:         snap.stress    ?? prev.stress,
    temp:           snap.temp_f    ?? prev.temp,
    humidity:       snap.humidity  ?? prev.humidity,
    co2:            snap.co2_ppm   ?? prev.co2,
    pm25:           snap.pm25      ?? prev.pm25,
    systemScore:    prev.systemScore,
  }
}

export function useRealtime(): LiveMetrics {
  const [metrics, setMetrics] = useState<LiveMetrics>(SIM_BASE)
  const simRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef  = useRef(0)
  const liveRef  = useRef(false)
  const stateRef = useRef<LiveMetrics>(SIM_BASE)

  // Keep ref in sync
  useEffect(() => { stateRef.current = metrics }, [metrics])

  useEffect(() => {
    // Simulation — always running as baseline
    simRef.current = setInterval(() => {
      if (liveRef.current) return // real data takes over
      const next = simTick(stateRef.current)
      tickRef.current++
      setMetrics({ ...next, tick: tickRef.current })
    }, 2500)

    // Poll /api/ingest for real hardware snapshot every 3s
    const tryLive = async () => {
      try {
        const res = await fetch('/api/ingest', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json() as { snapshot?: IngestSnapshot; ts?: number }
        if (!data.snapshot) return
        // Only trust data fresher than 30s
        if (data.ts && Date.now() - data.ts > 30_000) return
        liveRef.current = true
        tickRef.current++
        setMetrics(prev => snapshotToMetrics(data.snapshot!, prev, tickRef.current))
      } catch {
        liveRef.current = false
      }
    }

    pollRef.current = setInterval(tryLive, 3000)
    tryLive() // immediate first attempt

    return () => {
      if (simRef.current)  clearInterval(simRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  return metrics
}
