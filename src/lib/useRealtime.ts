import { useState, useEffect, useRef } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
function noise(v: number, range: number) {
  return v + (Math.random() - 0.5) * range
}

export type LiveMetrics = {
  load: number
  solar: number
  grid: number
  batterySoc: number
  batteryCurrent: number
  heartRate: number
  hrv: number
  spo2: number
  stress: number
  co2: number
  temp: number
  humidity: number
  pm25: number
  systemScore: number
  tick: number
}

const BASE: LiveMetrics = {
  load: 9.17,
  solar: 3.42,
  grid: 5.75,
  batterySoc: 74,
  batteryCurrent: -8.4,
  heartRate: 62,
  hrv: 48,
  spo2: 98.2,
  stress: 18,
  co2: 612,
  temp: 72.4,
  humidity: 48,
  pm25: 8,
  systemScore: 87,
  tick: 0,
}

export function useRealtime(intervalMs = 2500): LiveMetrics {
  const [metrics, setMetrics] = useState<LiveMetrics>(BASE)
  const ref = useRef(metrics)
  ref.current = metrics

  useEffect(() => {
    const id = setInterval(() => {
      const p = ref.current
      const solar = clamp(noise(p.solar, 0.12), 0, 5)
      const load  = clamp(noise(p.load,  0.08), 7.5, 11)
      const grid  = clamp(load - solar, 0, 10)
      const soc   = clamp(p.batterySoc + (Math.random() > 0.7 ? -0.1 : 0), 60, 95)
      const score = clamp(
        Math.round((p.systemScore + (Math.random() - 0.48) * 1.2)),
        72, 98,
      )
      setMetrics({
        load:            +load.toFixed(2),
        solar:           +solar.toFixed(2),
        grid:            +grid.toFixed(2),
        batterySoc:      +soc.toFixed(1),
        batteryCurrent:  +(noise(p.batteryCurrent, 0.3)).toFixed(1),
        heartRate:       Math.round(clamp(noise(p.heartRate, 1.5), 56, 74)),
        hrv:             Math.round(clamp(noise(p.hrv, 2), 38, 62)),
        spo2:            +clamp(noise(p.spo2, 0.1), 97, 99.5).toFixed(1),
        stress:          Math.round(clamp(noise(p.stress, 2), 10, 35)),
        co2:             Math.round(clamp(noise(p.co2, 8), 580, 680)),
        temp:            +clamp(noise(p.temp, 0.2), 70, 75).toFixed(1),
        humidity:        +clamp(noise(p.humidity, 0.5), 42, 56).toFixed(0),
        pm25:            Math.round(clamp(noise(p.pm25, 1), 4, 18)),
        systemScore:     score,
        tick:            p.tick + 1,
      })
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return metrics
}
