import type { InstallationState } from "./types.js";
import { redis } from "../redis.js";

const key = (id: string) => `aurora:state:${id}`;

const DEFAULT: InstallationState = {
  energy: { loadW: 600, solarW: 0, batterySoc: 70, gridPriceCents: 18 },
  bio:    { hr: 70, hrv: 60, stress: 20 },
  env:    { tempC: 22, humidity: 45, co2Ppm: 700, pm25: 8 },
  updatedAt: Date.now(),
};

export async function getState(instId: string): Promise<InstallationState> {
  const raw = await redis.get(key(instId));
  return raw ? JSON.parse(raw) as InstallationState : { ...DEFAULT };
}

export async function setState(instId: string, s: InstallationState) {
  await redis.set(key(instId), JSON.stringify({ ...s, updatedAt: Date.now() }));
}

export async function patchState(instId: string, patch: Partial<InstallationState>) {
  const cur = await getState(instId);
  const next: InstallationState = {
    energy: { ...cur.energy, ...(patch.energy ?? {}) },
    bio:    { ...cur.bio,    ...(patch.bio    ?? {}) },
    env:    { ...cur.env,    ...(patch.env    ?? {}) },
    updatedAt: Date.now(),
  };
  await setState(instId, next);
  return next;
}
