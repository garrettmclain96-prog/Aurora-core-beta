import { PageTransition } from '../components/PageTransition'
import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import { FlaskConical, Sparkles, Loader2 } from 'lucide-react'
import { PageHeader, SectionLabel } from '../components/Layout'
import { scenarios } from '../lib/seed'

export function Simulation() {
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, string>>({})

  const analyze = async (scenarioId: string) => {
    const s = scenarios.find(s => s.id === scenarioId)!
    setAnalyzing(scenarioId)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: `You are Aurora Core's predictive simulation AI. Analyze energy optimization scenarios concisely — 3–4 sentences max. Focus on real-world implications, trade-offs, and a concrete recommendation.`,
          messages: [{
            role: 'user',
            content: `Analyze this Monte Carlo scenario:
Name: ${s.name}
Success probability: ${s.probability}%
Estimated savings: ${s.savings}/day
CO₂ reduction: ${s.co2}
Description: ${s.desc}
Metrics: ${s.radar.map(r => `${r.metric}: ${r.value}%`).join(', ')}

Give a brief, practical assessment.`,
          }],
        }),
      })
      const data = await res.json()
      const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? 'Analysis unavailable.'
      setAnalyses(prev => ({ ...prev, [scenarioId]: text }))
    } catch {
      setAnalyses(prev => ({ ...prev, [scenarioId]: 'Analysis failed — check API key configuration.' }))
    } finally {
      setAnalyzing(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Predictive Simulation"
        subtitle="Monte Carlo · Temporal Fusion Transformer · Multi-horizon forecasting"
      />

      <div className="p-6 space-y-6">
        {/* System info */}
        <div className="card aurora-gradient p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-[var(--color-cyan)] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-display font-semibold text-[var(--color-text)] mb-1">Simulation Engine Active</div>
              <div className="text-[10px] text-[var(--color-muted)]">
                Running 12,000 Monte Carlo samples/second across 3 active scenarios.
                TFT models cover 1h, 6h, 24h, and 7d horizons with uncertainty quantification.
                Click "Analyze with AI" to invoke Aurora Core's language model for scenario assessment.
              </div>
            </div>
          </div>
        </div>

        {/* Scenario cards */}
        <SectionLabel>Active Scenarios</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {scenarios.map(s => (
            <div key={s.id} className="card card-glow p-5 flex flex-col" style={{ borderColor: s.color + '30' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-display font-bold text-[var(--color-text)]">{s.name}</div>
                <div
                  className="mono text-lg font-bold"
                  style={{ color: s.color, textShadow: `0 0 10px ${s.color}80` }}
                >{s.probability}%</div>
              </div>
              <div className="text-[10px] text-[var(--color-muted)] mb-1">Success probability</div>

              {/* Savings + CO2 */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 bg-[var(--color-elevated)] rounded p-2 text-center">
                  <div className="text-[9px] font-display text-[var(--color-muted)] uppercase">Savings</div>
                  <div className="mono text-sm font-bold text-[var(--color-green)]">{s.savings}</div>
                  <div className="text-[9px] text-[var(--color-muted)]">/ day</div>
                </div>
                <div className="flex-1 bg-[var(--color-elevated)] rounded p-2 text-center">
                  <div className="text-[9px] font-display text-[var(--color-muted)] uppercase">CO₂</div>
                  <div className="mono text-sm font-bold text-[var(--color-cyan)]">{s.co2}</div>
                  <div className="text-[9px] text-[var(--color-muted)]">/ day</div>
                </div>
              </div>

              {/* Radar chart */}
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={s.radar} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: 'var(--color-muted)', fontFamily: 'Share Tech Mono' }} />
                  <Radar name={s.name} dataKey="value" stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Description */}
              <p className="text-[10px] text-[var(--color-muted)] my-3 flex-1">{s.desc}</p>

              {/* Analyze button */}
              <button
                onClick={() => analyze(s.id)}
                disabled={!!analyzing}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-display font-semibold border transition-all disabled:opacity-50"
                style={{ borderColor: s.color + '50', color: s.color, backgroundColor: s.color + '10' }}
              >
                {analyzing === s.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</>
                  : <><Sparkles className="w-3 h-3" /> Analyze with AI</>}
              </button>

              {/* Analysis result */}
              {analyses[s.id] && (
                <div className="mt-3 p-3 rounded-md bg-[var(--color-elevated)] border border-[var(--color-border)] text-[11px] text-[var(--color-text)] leading-relaxed">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3" style={{ color: s.color }} />
                    <span className="text-[9px] font-display uppercase tracking-wide" style={{ color: s.color }}>AI Analysis</span>
                  </div>
                  {analyses[s.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
