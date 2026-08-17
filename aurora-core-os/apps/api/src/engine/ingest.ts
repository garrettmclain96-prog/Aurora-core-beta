import { createHmac } from "node:crypto";
import { db } from "../db.js";
import { pub, channel } from "../redis.js";
import { patchState, getState } from "./state.js";
import { decide } from "./scoring.js";
import type { Mode } from "./types.js";

interface EventInput {
  domain: "ENERGY" | "BIOMETRIC" | "ENVIRONMENT";
  kind: string; value: number; payload?: any;
}

const MAP: Record<string, [string, string]> = {
  load_w:           ["energy", "loadW"],
  solar_w:          ["energy", "solarW"],
  battery_soc:      ["energy", "batterySoc"],
  grid_price_cents: ["energy", "gridPriceCents"],
  hr_bpm:           ["bio",    "hr"],
  hrv_ms:           ["bio",    "hrv"],
  stress:           ["bio",    "stress"],
  temp_c:           ["env",    "tempC"],
  humidity:         ["env",    "humidity"],
  co2_ppm:          ["env",    "co2Ppm"],
  pm25:             ["env",    "pm25"],
};

async function recentScores(installationId: string, n = 10): Promise<number[]> {
  const rows = await db.insight.findMany({
    where: { installationId }, orderBy: { ts: "desc" }, take: n, select: { score: true },
  });
  return rows.map(r => r.score).reverse();
}

export async function ingest(installationId: string, ev: EventInput) {
  await db.event.create({ data: { installationId, ...ev } });

  const m = MAP[ev.kind];
  if (!m) return null;
  const [bucket, field] = m;
  const patch: any = { [bucket]: { [field]: ev.value } };
  const state = await patchState(installationId, patch);

  const cfg  = await db.modeConfig.findUnique({ where: { installationId } });
  const mode = (cfg?.active ?? "habitat_optimizer") as Mode;
  const hist = await recentScores(installationId);
  const result = decide(state, mode, hist);

  const insight = await db.insight.create({
    data: {
      installationId, score: result.score,
      breakdown: result.breakdown as any, signals: result.signals as any,
    },
  });

  for (const a of result.actions) {
    const dev = await db.device.findFirst({ where: { installationId, kind: a.deviceKind } });
    if (!dev) continue;
    const action = await db.action.create({
      data: { installationId, deviceId: dev.id, command: a.command, args: a.args, reason: a.reason },
    });
    await db.auditLog.create({
      data: { installationId, actor: "engine", action: "device.command", target: dev.id, meta: { command: a.command, reason: a.reason } },
    });
    await pub.publish(channel(installationId), JSON.stringify({ type: "action", action }));
  }

  await pub.publish(channel(installationId), JSON.stringify({
    type: "score", score: result.score, breakdown: result.breakdown,
    signals: result.signals, trend: result.trend, predictedScore: result.predictedScore,
  }));
  await pub.publish(channel(installationId), JSON.stringify({ type: "state", state }));

  dispatchWebhooks(installationId, "score.updated", {
    score: result.score, breakdown: result.breakdown,
    signals: result.signals, trend: result.trend,
  }).catch(() => {});

  if (result.signals.some(s => s.severity === "alert")) {
    dispatchWebhooks(installationId, "alert.triggered", {
      signals: result.signals.filter(s => s.severity === "alert"),
    }).catch(() => {});
  }

  return { insight, result, state };
}

async function dispatchWebhooks(installationId: string, event: string, payload: any) {
  let hooks: any[] = [];
  try {
    hooks = await (db as any).webhook.findMany({ where: { installationId, enabled: true } });
  } catch { return; } // webhook table may not exist yet

  for (const hook of hooks) {
    if (!(hook.events as string[]).includes(event) && !(hook.events as string[]).includes("*")) continue;
    try {
      const body = JSON.stringify({ event, installationId, payload, ts: Date.now() });
      const sig  = "sha256=" + createHmac("sha256", hook.secret).update(body).digest("hex");
      await fetch(hook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-aurora-event": event, "x-aurora-signature": sig, "user-agent": "Aurora-Core/2.0" },
        body,
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* best-effort */ }
  }
}
