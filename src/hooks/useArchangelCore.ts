/**
 * Aurora Core — useArchangelCore Hook
 * Feeds LiveMetrics through the ARCHANGEL pipeline every cycle.
 * Exposes sealed packets, pipeline traces, and live metrics.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LiveMetrics } from '../types'
import {
  archangelCore,
  type SealedPacket,
  type PipelineTrace,
  type PipelineMetrics,
  type ServicePayload,
  type ServiceSource,
} from '../services/ArchangelCore'

export interface ArchangelState {
  metrics:       PipelineMetrics
  recentTraces:  PipelineTrace[]
  recentSealed:  SealedPacket[]
  lastTrace:     PipelineTrace | null
  isEntropySpike: boolean
}

const TRACE_HISTORY = 20

/**
 * Map LiveMetrics into discrete ServicePayloads — one per integration source.
 * In production these would come from real API responses; here they are
 * derived from the live simulation data so the pipeline runs on real numbers.
 */
function liveMetricsToPayloads(m: LiveMetrics): ServicePayload[] {
  const now = Date.now()

  const sources: { source: ServiceSource; data: Record<string, unknown> }[] = [
    { source: 'ercot',          data: { value: m.load,        load: m.load, grid: m.grid } },
    { source: 'eia',            data: { value: m.grid,        grid: m.grid } },
    { source: 'enphase',        data: { value: m.solar,       solar: m.solar } },
    { source: 'tesla_powerwall',data: { value: m.batterySoc,  soc: m.batterySoc, current: m.batteryCurrent } },
    { source: 'ecobee',         data: { value: m.temp,        temp: m.temp, humidity: m.humidity } },
    { source: 'openweather',    data: { value: m.temp,        temp: m.temp, humidity: m.humidity, co2: m.co2 } },
    { source: 'home_assistant', data: { value: m.pm25,        pm25: m.pm25, co2: m.co2 } },
    { source: 'shelly',         data: { value: m.load,        load: m.load } },
    { source: 'mqtt',           data: { value: m.heartRate,   hr: m.heartRate, hrv: m.hrv, spo2: m.spo2 } },
    { source: 'turnbot',        data: { value: m.stress,      stress: m.stress, systemScore: m.systemScore } },
    { source: 'nest',           data: { value: m.temp,        temp: m.temp } },
    { source: 'sonoff',         data: { value: m.load,        load: m.load } },
    { source: 'tuya',           data: { value: m.humidity,    humidity: m.humidity } },
  ]

  // Each source gets a slightly staggered timestamp to simulate real async arrival
  return sources.map((s, i) => ({
    source:    s.source,
    data:      s.data,
    timestamp: now - i * 120,  // stagger by 120ms per source
  }))
}

export function useArchangelCore(liveMetrics: LiveMetrics): ArchangelState {
  const [state, setState] = useState<ArchangelState>({
    metrics:        archangelCore.getMetrics(),
    recentTraces:   [],
    recentSealed:   [],
    lastTrace:      null,
    isEntropySpike: false,
  })

  const tracesRef = useRef<PipelineTrace[]>([])
  const sealedRef = useRef<SealedPacket[]>([])
  const tickRef   = useRef(-1)

  const runPipeline = useCallback((m: LiveMetrics) => {
    const payloads = liveMetricsToPayloads(m)
    const { sealed, traces } = archangelCore.processBatch(payloads)

    // Append to rolling history
    tracesRef.current = [...tracesRef.current, ...traces].slice(-TRACE_HISTORY)
    sealedRef.current = [...sealedRef.current, ...sealed].slice(-TRACE_HISTORY)

    const newMetrics = archangelCore.getMetrics()

    setState({
      metrics:        newMetrics,
      recentTraces:   [...tracesRef.current],
      recentSealed:   [...sealedRef.current],
      lastTrace:      traces[traces.length - 1] ?? null,
      isEntropySpike: newMetrics.entropySpike,
    })
  }, [])

  useEffect(() => {
    // Only run when the metrics tick advances (avoids re-running on same data)
    if (liveMetrics.tick === tickRef.current) return
    tickRef.current = liveMetrics.tick
    runPipeline(liveMetrics)
  }, [liveMetrics.tick, liveMetrics, runPipeline])

  return state
}
