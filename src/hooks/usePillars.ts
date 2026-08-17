/**
 * Aurora Core — usePillars Hook
 * Feeds SealedPackets from ARCHANGEL into the XIII Pillars governance engine.
 * Exposes live pillar states, verdicts, and overall system sovereignty.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { pillarsEngine, type PillarsState } from '../services/PillarsEngine'
import { useArchangelCore } from './useArchangelCore'
import type { LiveMetrics } from '../types'

const EMPTY_STATE: PillarsState = {
  pillars:         pillarsEngine.getPillars(),
  verdicts:        [],
  activeCount:     0,
  conflictCount:   0,
  violationCount:  0,
  overallState:    'sovereign',
  dominantVerdict: null,
}

export function usePillars(liveMetrics: LiveMetrics): PillarsState {
  const archangel      = useArchangelCore(liveMetrics)
  const [state, setState] = useState<PillarsState>(EMPTY_STATE)
  const lastTickRef    = useRef(-1)

  const evaluate = useCallback((sealed: typeof archangel.recentSealed) => {
    if (sealed.length === 0) return
    const newState = pillarsEngine.evaluate(sealed)
    setState(newState)
  }, [])

  useEffect(() => {
    if (liveMetrics.tick === lastTickRef.current) return
    lastTickRef.current = liveMetrics.tick
    evaluate(archangel.recentSealed)
  }, [liveMetrics.tick, archangel.recentSealed, evaluate])

  return state
}
