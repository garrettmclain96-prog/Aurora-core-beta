"use client";
import { useState } from "react";
import { aurora } from "@/lib/aurora";

const MODES = [
  { id: "energy_guardian",   label: "Energy Guardian" },
  { id: "health_sentinel",   label: "Health Sentinel" },
  { id: "habitat_optimizer", label: "Habitat Optimizer" },
];

export function ModeSelector({ initial }: { initial: string }) {
  const [mode, setMode] = useState(initial);
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-widest text-teal/70 mb-3">Mode</div>
      <div className="flex flex-col gap-2">
        {MODES.map(m => (
          <button key={m.id}
            onClick={async () => { setMode(m.id); await aurora.setMode(m.id as any); }}
            className={`text-left px-3 py-2 rounded border ${mode === m.id ? "border-teal text-teal" : "border-line text-teal/60 hover:border-teal/60"}`}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
