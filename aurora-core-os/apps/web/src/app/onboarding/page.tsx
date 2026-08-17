"use client";
import { useState } from "react";
import { aurora } from "@/lib/aurora";

const STEPS = ["intro", "domain", "first-event", "done"] as const;
type Step = typeof STEPS[number];

export default function Onboarding() {
  const [step, setStep] = useState<Step>("intro");
  const [domain, setDomain] = useState<"ENERGY"|"BIOMETRIC"|"ENVIRONMENT">("ENERGY");
  const [last, setLast] = useState<any>(null);

  async function sendMock() {
    const sample = domain === "ENERGY"      ? { domain, kind: "solar_w", value: 1200 }
                 : domain === "BIOMETRIC"   ? { domain, kind: "hr_bpm",  value: 72 }
                 :                            { domain, kind: "co2_ppm", value: 850 };
    const r = await aurora.sendEvent(sample);
    setLast(r); setStep("done");
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl text-teal glow">Welcome to Aurora</h1>
      {step === "intro" && (
        <div className="panel p-6 space-y-3">
          <p>I'm Aurora — a cognitive engine for your energy, body, and environment.</p>
          <p className="text-teal/70 text-sm">I'll guide you through your first reading. It takes about 60 seconds.</p>
          <button onClick={() => setStep("domain")} className="px-4 py-2 border border-teal text-teal rounded hover:bg-teal/10">Begin</button>
        </div>
      )}
      {step === "domain" && (
        <div className="panel p-6 space-y-3">
          <div>What would you like to start with?</div>
          {(["ENERGY","BIOMETRIC","ENVIRONMENT"] as const).map(d => (
            <button key={d} onClick={() => { setDomain(d); setStep("first-event"); }}
              className={`block w-full text-left px-3 py-2 rounded border ${domain === d ? "border-teal text-teal" : "border-line text-teal/60"}`}>
              {d.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {step === "first-event" && (
        <div className="panel p-6 space-y-3">
          <div>Send a sample {domain.toLowerCase()} reading to your installation?</div>
          <button onClick={sendMock} className="px-4 py-2 border border-teal text-teal rounded hover:bg-teal/10">Send sample event</button>
        </div>
      )}
      {step === "done" && (
        <div className="panel p-6 space-y-3">
          <div className="text-teal glow">All set.</div>
          <pre className="text-xs overflow-auto">{JSON.stringify(last, null, 2)}</pre>
          <a href="/" className="text-teal underline">→ Open the Console</a>
        </div>
      )}
    </div>
  );
}
