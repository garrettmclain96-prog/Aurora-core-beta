"use client";

interface Breakdown {
  energy:      number;
  biometric:   number;
  environment: number;
  mode:        string;
}

const MODE_LABELS: Record<string, string> = {
  energy_guardian:   "Energy Guardian",
  health_sentinel:   "Health Sentinel",
  habitat_optimizer: "Habitat Optimizer",
};

function DomainBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-teal/50 uppercase tracking-wider">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            transition: "width 700ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

export function ScoreGauge({ score, breakdown }: { score: number; breakdown?: Breakdown }) {
  const r   = 70;
  const c   = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color =
    score >= 75 ? "#22f1d3" :
    score >= 50 ? "#f5d76e" :
                  "#ff5f7e";

  return (
    <div className="panel p-6 flex flex-col items-center gap-3">
      <div className="text-xs uppercase tracking-widest text-teal/70">System Score</div>

      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} stroke="#0f2027" strokeWidth="10" fill="none" />
        <circle
          cx="90" cy="90" r={r}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
        <text
          x="90" y="90"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="44"
          fill={color}
          fontWeight="700"
          style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}
        >
          {score}
        </text>
      </svg>

      <div className="text-[10px] text-teal/50">
        {breakdown ? (MODE_LABELS[breakdown.mode] ?? breakdown.mode) : "0 critical · 100 optimal"}
      </div>

      {breakdown && (
        <div className="w-full space-y-2 border-t border-line/40 pt-3">
          <DomainBar label="Energy"  value={breakdown.energy}      color="#22f1d3" />
          <DomainBar label="Bio"     value={breakdown.biometric}   color="#c850ff" />
          <DomainBar label="Env"     value={breakdown.environment} color="#f5d76e" />
        </div>
      )}
    </div>
  );
}
