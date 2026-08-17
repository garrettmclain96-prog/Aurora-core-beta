/**
 * useJarvisProactive — JARVIS monitors live metrics and interrupts proactively
 * Fires spoken + visual alerts when thresholds are crossed.
 */
import { useEffect, useRef, useCallback } from 'react'
import type { LiveMetrics } from '../types'

export interface ProactiveAlert {
  id: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  ts: Date
}

interface Thresholds {
  batterySocLow: number
  batterySocCritical: number
  co2Warning: number
  co2Critical: number
  loadHigh: number
  stressHigh: number
}

const DEFAULTS: Thresholds = {
  batterySocLow: 30,
  batterySocCritical: 15,
  co2Warning: 600,
  co2Critical: 800,
  loadHigh: 11,
  stressHigh: 65,
}

const COOLDOWN_MS = 5 * 60 * 1000 // 5 min between same alert

function speakJarvis(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find(v => v.name === 'Daniel')
          || voices.find(v => v.lang === 'en-GB')
          || voices.find(v => v.lang.startsWith('en'))
          || null
  u.rate = 0.88; u.pitch = 0.72; u.volume = 1.0
  window.speechSynthesis.speak(u)
}

export function useJarvisProactive(
  metrics: LiveMetrics,
  voiceEnabled: boolean,
  onAlert: (alert: ProactiveAlert) => void
) {
  const lastFired = useRef<Record<string, number>>({})
  const prevMetrics = useRef<LiveMetrics>(metrics)

  const fire = useCallback((id: string, message: string, severity: ProactiveAlert['severity']) => {
    const now = Date.now()
    if ((now - (lastFired.current[id] ?? 0)) < COOLDOWN_MS) return
    lastFired.current[id] = now
    const alert: ProactiveAlert = { id, message, severity, ts: new Date() }
    onAlert(alert)
    if (voiceEnabled) speakJarvis(message)
  }, [voiceEnabled, onAlert])

  useEffect(() => {
    const p = prevMetrics.current
    const m = metrics

    // Battery critical
    if (m.batterySoc <= DEFAULTS.batterySocCritical && p.batterySoc > DEFAULTS.batterySocCritical)
      fire('batt_critical', `Sir, battery is at ${m.batterySoc}%. That is critical. Recommend immediate shore connection or load shed.`, 'critical')
    else if (m.batterySoc <= DEFAULTS.batterySocLow && p.batterySoc > DEFAULTS.batterySocLow)
      fire('batt_low', `Battery dropping below ${DEFAULTS.batterySocLow}%, sir. Currently at ${m.batterySoc}%. Initiating peak-shave protocol.`, 'warning')

    // CO2
    if (m.co2 >= DEFAULTS.co2Critical && p.co2 < DEFAULTS.co2Critical)
      fire('co2_critical', `CO₂ at ${m.co2} parts per million, sir. Ventilation required immediately. Opening vent fan to 100%.`, 'critical')
    else if (m.co2 >= DEFAULTS.co2Warning && p.co2 < DEFAULTS.co2Warning)
      fire('co2_warn', `CO₂ crossing ${DEFAULTS.co2Warning} parts per million. I'd recommend opening a window, sir. Or at least breathing less.`, 'warning')

    // High load during peak hours
    const hour = new Date().getHours()
    if (m.load >= DEFAULTS.loadHigh && hour >= 16 && hour <= 21)
      fire('load_peak', `Load at ${m.load} kilowatts during peak pricing window, sir. You're paying premium rates right now. Shall I shed non-critical circuits?`, 'warning')

    // Stress spike
    if (m.stress >= DEFAULTS.stressHigh && p.stress < DEFAULTS.stressHigh)
      fire('stress_high', `Biometric stress index elevated to ${m.stress}, sir. Might I suggest stepping away from whatever is causing that.`, 'info')

    // Solar coming online
    if (m.solar > 0.5 && p.solar <= 0.5)
      fire('solar_on', `Solar online, sir. Currently generating ${m.solar} kilowatts. Switching to self-consumption mode.`, 'info')

    // Solar going offline (sunset)
    if (m.solar <= 0.1 && p.solar > 0.5)
      fire('solar_off', `Solar generation ending for the day, sir. Total generation was ${p.solar} kilowatts. Switching to battery reserve.`, 'info')

    prevMetrics.current = m
  }, [metrics, fire])
}
