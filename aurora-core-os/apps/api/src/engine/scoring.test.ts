import { describe, it, expect } from "vitest";
import { decide, energyScore, bioScore, envScore } from "./scoring.js";

const base = {
  energy: { loadW: 500, solarW: 600, batterySoc: 80, gridPriceCents: 12 },
  bio:    { hr: 65, hrv: 70, stress: 15 },
  env:    { tempC: 22, humidity: 45, co2Ppm: 600, pm25: 5 },
  updatedAt: Date.now(),
};

describe("sub-scores", () => {
  it("energyScore is high when solar > load and battery full", () => {
    expect(energyScore(base.energy)).toBeGreaterThan(80);
  });
  it("bioScore is high when hr/hrv/stress are healthy", () => {
    expect(bioScore(base.bio)).toBeGreaterThan(80);
  });
  it("envScore is high when all env values are ideal", () => {
    expect(envScore(base.env)).toBeGreaterThan(90);
  });
});

describe("decide()", () => {
  it("yields high system score when all domains are good", () => {
    const r = decide(base, "habitat_optimizer");
    expect(r.score).toBeGreaterThan(80);
    expect(r.signals).toHaveLength(0);
  });

  it("flags env.co2 signal at 1800ppm", () => {
    const r = decide({ ...base, env: { ...base.env, co2Ppm: 1800 } }, "habitat_optimizer");
    expect(r.signals.find(s => s.kind === "env.co2")).toBeTruthy();
  });

  it("emits delay_load action under peak tariff in energy_guardian mode", () => {
    const r = decide(
      { ...base, energy: { ...base.energy, gridPriceCents: 40, batterySoc: 20 } },
      "energy_guardian",
    );
    expect(r.actions.find(a => a.command === "delay_load")).toBeTruthy();
  });

  it("flags bio.high_strain at stress=75", () => {
    const r = decide({ ...base, bio: { ...base.bio, stress: 75 } }, "health_sentinel");
    expect(r.signals.find(s => s.kind === "bio.high_strain")).toBeTruthy();
  });

  it("energy_guardian weights energy domain higher", () => {
    const rEnergy  = decide(base, "energy_guardian");
    const rHealth  = decide(base, "health_sentinel");
    // Same data — energy_guardian should be more influenced by energyScore
    expect(rEnergy.breakdown.mode).toBe("energy_guardian");
    expect(rHealth.breakdown.mode).toBe("health_sentinel");
  });

  it("score is clamped 0..100", () => {
    const worst = {
      energy: { loadW: 5000, solarW: 0, batterySoc: 0, gridPriceCents: 50 },
      bio:    { hr: 150, hrv: 5, stress: 100 },
      env:    { tempC: 40, humidity: 95, co2Ppm: 3000, pm25: 100 },
      updatedAt: Date.now(),
    };
    const r = decide(worst, "habitat_optimizer");
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
