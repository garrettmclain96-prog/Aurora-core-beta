import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "../db.js";
import { apiKeyAuth } from "../auth.js";
import { rateLimit } from "../rateLimit.js";
import { ingest } from "../engine/ingest.js";
import { getState } from "../engine/state.js";
import { decide } from "../engine/scoring.js";
import { pub, channel, redis } from "../redis.js";
import { log } from "../log.js";
import type { Mode } from "../engine/types.js";

const r = Router();
r.use(apiKeyAuth, rateLimit);

// ── Schemas ──────────────────────────────────────────────────────────────────

const eventSchema = z.object({
  domain:  z.enum(["ENERGY", "BIOMETRIC", "ENVIRONMENT"]),
  kind:    z.string().min(1).max(64),
  value:   z.number().finite(),
  payload: z.any().optional(),
});

const cmdSchema = z.object({
  command: z.string().min(1).max(64),
  args:    z.any().optional(),
  reason:  z.string().max(256).optional(),
});

const modeSchema = z.object({
  mode: z.enum(["energy_guardian", "health_sentinel", "habitat_optimizer"]),
});

// ── Events ───────────────────────────────────────────────────────────────────

/** POST /v1/events — single or batch */
r.post("/events", async (req, res, next) => {
  try {
    const body   = Array.isArray(req.body) ? req.body : [req.body];
    const events = body.map((e) => eventSchema.parse(e));
    const out    = [];
    for (const e of events) out.push(await ingest(req.installationId!, e));
    res.status(202).json({
      accepted: events.length,
      results:  out.map(o => o && { score: o.result.score, trend: o.result.trend }),
    });
  } catch (e) { next(e); }
});

// ── State ────────────────────────────────────────────────────────────────────

/** GET /v1/state */
r.get("/state", async (req, res, next) => {
  try {
    const s = await getState(req.installationId!);
    res.json({ installationId: req.installationId, state: s });
  } catch (e) { next(e); }
});

// ── Insights ─────────────────────────────────────────────────────────────────

/** GET /v1/insights — current + history */
r.get("/insights", async (req, res, next) => {
  try {
    const cfg   = await db.modeConfig.findUnique({ where: { installationId: req.installationId! } });
    const mode  = (cfg?.active ?? "habitat_optimizer") as Mode;
    const state = await getState(req.installationId!);
    const hist  = await db.insight.findMany({ where: { installationId: req.installationId! }, orderBy: { ts: "desc" }, take: 10, select: { score: true } });
    const scores = hist.map(h => h.score).reverse();
    const result = decide(state, mode, scores);
    const recent = await db.insight.findMany({
      where: { installationId: req.installationId! }, orderBy: { ts: "desc" }, take: 48,
    });
    res.json({ current: result, history: recent });
  } catch (e) { next(e); }
});

// ── History ──────────────────────────────────────────────────────────────────

/** GET /v1/history?domain=ENERGY&kind=solar_w&from=ISO&to=ISO&limit=200 */
r.get("/history", async (req, res, next) => {
  try {
    const domain = req.query.domain as string | undefined;
    const kind   = req.query.kind   as string | undefined;
    const from   = req.query.from   ? new Date(req.query.from as string) : new Date(Date.now() - 86_400_000);
    const to     = req.query.to     ? new Date(req.query.to   as string) : new Date();
    const limit  = Math.min(Number(req.query.limit ?? 500), 2000);

    const events = await db.event.findMany({
      where: {
        installationId: req.installationId!,
        ...(domain ? { domain: domain as any } : {}),
        ...(kind   ? { kind }                  : {}),
        ts: { gte: from, lte: to },
      },
      orderBy: { ts: "asc" },
      take: limit,
      select: { id: true, domain: true, kind: true, value: true, ts: true },
    });
    res.json({ events, count: events.length, from: from.toISOString(), to: to.toISOString() });
  } catch (e) { next(e); }
});

/** GET /v1/history/scores?from=ISO&to=ISO&limit=200 */
r.get("/history/scores", async (req, res, next) => {
  try {
    const from  = req.query.from  ? new Date(req.query.from as string) : new Date(Date.now() - 86_400_000 * 7);
    const to    = req.query.to    ? new Date(req.query.to   as string) : new Date();
    const limit = Math.min(Number(req.query.limit ?? 500), 2000);
    const rows  = await db.insight.findMany({
      where: { installationId: req.installationId!, ts: { gte: from, lte: to } },
      orderBy: { ts: "asc" },
      take: limit,
      select: { id: true, score: true, breakdown: true, ts: true },
    });
    res.json({ scores: rows, count: rows.length });
  } catch (e) { next(e); }
});

// ── Devices ───────────────────────────────────────────────────────────────────

/** GET /v1/devices */
r.get("/devices", async (req, res, next) => {
  try {
    const devices = await db.device.findMany({ where: { installationId: req.installationId! } });
    res.json({ devices });
  } catch (e) { next(e); }
});

/** POST /v1/devices/:id/command */
r.post("/devices/:id/command", async (req, res, next) => {
  try {
    const body = cmdSchema.parse(req.body);
    const dev  = await db.device.findFirst({ where: { id: req.params.id, installationId: req.installationId! } });
    if (!dev) return res.status(404).json({ error: { code: "not_found", message: "Device not found" } });

    const action = await db.action.create({
      data: { installationId: req.installationId!, deviceId: dev.id, command: body.command, args: body.args, reason: body.reason ?? "manual" },
    });
    await db.auditLog.create({
      data: { installationId: req.installationId!, actor: `api_key:${req.apiKeyPrefix}`, action: "device.command", target: dev.id, meta: body },
    });
    await pub.publish(channel(req.installationId!), JSON.stringify({ type: "action", action }));
    res.status(202).json({ action });
  } catch (e) { next(e); }
});

/** PATCH /v1/devices/:id — update label / online status */
r.patch("/devices/:id", async (req, res, next) => {
  try {
    const schema = z.object({ label: z.string().optional(), online: z.boolean().optional() });
    const body   = schema.parse(req.body);
    const dev    = await db.device.findFirst({ where: { id: req.params.id, installationId: req.installationId! } });
    if (!dev) return res.status(404).json({ error: { code: "not_found", message: "Device not found" } });
    const updated = await db.device.update({ where: { id: dev.id }, data: body });
    res.json({ device: updated });
  } catch (e) { next(e); }
});

// ── Modes ─────────────────────────────────────────────────────────────────────

const MODE_META = [
  { id: "energy_guardian",   label: "Energy Guardian",   focus: "Cost, solar self-consumption, peak shaving", weights: { energy: 0.60, bio: 0.15, env: 0.25 } },
  { id: "health_sentinel",   label: "Health Sentinel",   focus: "HR, HRV, stress, recovery (non-medical)",   weights: { energy: 0.15, bio: 0.60, env: 0.25 } },
  { id: "habitat_optimizer", label: "Habitat Optimizer", focus: "Balanced comfort and air quality",           weights: { energy: 0.33, bio: 0.33, env: 0.34 } },
];

/** GET /v1/config/modes */
r.get("/config/modes", async (req, res, next) => {
  try {
    const cfg = await db.modeConfig.findUnique({ where: { installationId: req.installationId! } });
    res.json({ active: cfg?.active ?? "habitat_optimizer", available: MODE_META });
  } catch (e) { next(e); }
});

/** POST /v1/config/mode */
r.post("/config/mode", async (req, res, next) => {
  try {
    const { mode } = modeSchema.parse(req.body);
    const cfg = await db.modeConfig.upsert({
      where:  { installationId: req.installationId! },
      update: { active: mode },
      create: { installationId: req.installationId!, active: mode },
    });
    await db.auditLog.create({
      data: { installationId: req.installationId!, actor: `api_key:${req.apiKeyPrefix}`, action: "mode.set", meta: { mode } },
    });
    await pub.publish(channel(req.installationId!), JSON.stringify({ type: "mode", mode }));
    res.json({ mode: cfg.active });
  } catch (e) { next(e); }
});

// ── Export ────────────────────────────────────────────────────────────────────

/** GET /v1/export — full installation snapshot as JSON */
r.get("/export", async (req, res, next) => {
  try {
    const [installation, devices, cfg, recent] = await Promise.all([
      db.installation.findUnique({ where: { id: req.installationId! }, select: { id: true, name: true, timezone: true, createdAt: true } }),
      db.device.findMany({ where: { installationId: req.installationId! } }),
      db.modeConfig.findUnique({ where: { installationId: req.installationId! } }),
      db.insight.findMany({ where: { installationId: req.installationId! }, orderBy: { ts: "desc" }, take: 100 }),
    ]);
    const state = await getState(req.installationId!);
    res.json({
      exportedAt: new Date().toISOString(),
      installation,
      mode:       cfg?.active ?? "habitat_optimizer",
      state,
      devices,
      recentInsights: recent,
    });
  } catch (e) { next(e); }
});

// ── Simulate ──────────────────────────────────────────────────────────────────

/** POST /v1/simulate — inject a realistic burst of demo events */
r.post("/simulate", async (req, res, next) => {
  try {
    const scenario = (req.body?.scenario as string) ?? "healthy";
    const SCENARIOS: Record<string, any[]> = {
      healthy: [
        { domain: "ENERGY",      kind: "solar_w",          value: 1350 },
        { domain: "ENERGY",      kind: "load_w",           value: 820  },
        { domain: "ENERGY",      kind: "battery_soc",      value: 78   },
        { domain: "ENERGY",      kind: "grid_price_cents",  value: 14   },
        { domain: "BIOMETRIC",   kind: "hr_bpm",           value: 64   },
        { domain: "BIOMETRIC",   kind: "hrv_ms",           value: 58   },
        { domain: "BIOMETRIC",   kind: "stress",           value: 22   },
        { domain: "ENVIRONMENT", kind: "temp_c",           value: 22.5 },
        { domain: "ENVIRONMENT", kind: "humidity",         value: 47   },
        { domain: "ENVIRONMENT", kind: "co2_ppm",          value: 650  },
        { domain: "ENVIRONMENT", kind: "pm25",             value: 7    },
      ],
      stress: [
        { domain: "ENERGY",      kind: "grid_price_cents",  value: 38   },
        { domain: "ENERGY",      kind: "battery_soc",      value: 18   },
        { domain: "BIOMETRIC",   kind: "stress",           value: 78   },
        { domain: "BIOMETRIC",   kind: "hr_bpm",           value: 105  },
        { domain: "ENVIRONMENT", kind: "co2_ppm",          value: 1700 },
        { domain: "ENVIRONMENT", kind: "pm25",             value: 42   },
      ],
      peak_solar: [
        { domain: "ENERGY", kind: "solar_w",     value: 4200 },
        { domain: "ENERGY", kind: "load_w",      value: 900  },
        { domain: "ENERGY", kind: "battery_soc", value: 62   },
      ],
    };
    const events = SCENARIOS[scenario] ?? SCENARIOS.healthy;
    const results = [];
    for (const e of events) results.push(await ingest(req.installationId!, e));
    const last = results.filter(Boolean).pop();
    res.json({ scenario, injected: events.length, score: last?.result.score ?? null });
  } catch (e) { next(e); }
});

// ── Webhooks ──────────────────────────────────────────────────────────────────

const webhookSchema = z.object({
  url:    z.string().url().max(512),
  events: z.array(z.string()).default(["*"]),
  label:  z.string().max(100).default(""),
});

/** GET /v1/webhooks */
r.get("/webhooks", async (req, res, next) => {
  try {
    const hooks = await db.webhook.findMany({ where: { installationId: req.installationId! }, select: { id: true, url: true, events: true, label: true, enabled: true, createdAt: true, lastFiredAt: true, lastStatus: true } });
    res.json({ webhooks: hooks });
  } catch (e) { next(e); }
});

/** POST /v1/webhooks */
r.post("/webhooks", async (req, res, next) => {
  try {
    const body   = webhookSchema.parse(req.body);
    const secret = randomBytes(24).toString("hex");
    const hook   = await db.webhook.create({
      data: { installationId: req.installationId!, ...body, secret },
    });
    res.status(201).json({ webhook: { ...hook, secret } });
  } catch (e) { next(e); }
});

/** DELETE /v1/webhooks/:id */
r.delete("/webhooks/:id", async (req, res, next) => {
  try {
    const hook = await db.webhook.findFirst({ where: { id: req.params.id, installationId: req.installationId! } });
    if (!hook) return res.status(404).json({ error: { code: "not_found", message: "Webhook not found" } });
    await db.webhook.delete({ where: { id: hook.id } });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// ── Audit log ─────────────────────────────────────────────────────────────────

/** GET /v1/audit?limit=50 */
r.get("/audit", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const logs  = await db.auditLog.findMany({
      where: { installationId: req.installationId! }, orderBy: { ts: "desc" }, take: limit,
    });
    res.json({ logs });
  } catch (e) { next(e); }
});

// ── Chat (AI) ─────────────────────────────────────────────────────────────────

/** POST /v1/chat — natural language queries about your installation */
r.post("/chat", async (req, res, next) => {
  try {
    const schema = z.object({ message: z.string().min(1).max(2000) });
    const { message } = schema.parse(req.body);

    // Build context from current state
    const [state, insights, devices, cfg] = await Promise.all([
      getState(req.installationId!),
      db.insight.findMany({ where: { installationId: req.installationId! }, orderBy: { ts: "desc" }, take: 5 }),
      db.device.findMany({ where: { installationId: req.installationId! } }),
      db.modeConfig.findUnique({ where: { installationId: req.installationId! } }),
    ]);
    const hist  = insights.map(i => i.score).reverse();
    const mode  = (cfg?.active ?? "habitat_optimizer") as Mode;
    const result = decide(state, mode, hist);

    const systemPrompt = `You are Aurora, an intelligent home operating system. You have access to live sensor data and system state. Always be concise, practical, and non-alarmist. Never provide medical diagnoses.

CURRENT SYSTEM STATE:
- System Score: ${result.score}/100 (${result.trend})
- Mode: ${mode.replace(/_/g, " ")}
- Energy: Load ${Math.round(state.energy.loadW)}W, Solar ${Math.round(state.energy.solarW)}W, Battery ${state.energy.batterySoc.toFixed(1)}%, Grid ${state.energy.gridPriceCents}¢/kWh
- Biometrics (non-medical): HR ${Math.round(state.bio.hr)}bpm, HRV ${Math.round(state.bio.hrv)}ms, Stress ${Math.round(state.bio.stress)}/100
- Environment: ${state.env.tempC.toFixed(1)}°C, ${Math.round(state.env.humidity)}% humidity, CO₂ ${Math.round(state.env.co2Ppm)}ppm, PM2.5 ${state.env.pm25.toFixed(1)}µg/m³
- Active signals: ${result.signals.length === 0 ? "None" : result.signals.map(s => `[${s.severity}] ${s.message}`).join("; ")}
- Devices: ${devices.map(d => `${d.label} (${d.kind}, ${d.online ? "online" : "offline"})`).join(", ")}

Respond helpfully. For commands like "set mode to energy guardian", output a JSON action block after your text: ACTION: {"type":"set_mode","mode":"energy_guardian"}`;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      return res.json({ reply: "AI chat requires ANTHROPIC_API_KEY to be configured on the server.", score: result.score });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: "user", content: message }],
      }),
    });

    const aiData: any = await aiRes.json();
    const text  = aiData.content?.[0]?.text ?? "Aurora is unavailable right now.";

    // Parse optional ACTION block
    const actionMatch = text.match(/ACTION:\s*(\{[^}]+\})/);
    const action = actionMatch ? JSON.parse(actionMatch[1]) : null;
    const reply  = text.replace(/ACTION:\s*\{[^}]+\}/, "").trim();

    // Execute action if present
    if (action?.type === "set_mode" && action.mode) {
      try {
        await db.modeConfig.upsert({
          where:  { installationId: req.installationId! },
          update: { active: action.mode },
          create: { installationId: req.installationId!, active: action.mode },
        });
        await pub.publish(channel(req.installationId!), JSON.stringify({ type: "mode", mode: action.mode }));
      } catch { /* non-fatal */ }
    }

    res.json({ reply, score: result.score, signals: result.signals, action });
  } catch (e) { next(e); }
});

// ── Actions list ──────────────────────────────────────────────────────────────

/** GET /v1/actions?status=PENDING&limit=20 */
r.get("/actions", async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const limit  = Math.min(Number(req.query.limit ?? 20), 100);
    const actions = await db.action.findMany({
      where:   { installationId: req.installationId!, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: "desc" },
      take:    limit,
      include: { device: { select: { label: true, kind: true } } },
    });
    res.json({ actions });
  } catch (e) { next(e); }
});

/** PATCH /v1/actions/:id — acknowledge an action */
r.patch("/actions/:id", async (req, res, next) => {
  try {
    const schema = z.object({ status: z.enum(["ACKED", "FAILED"]) });
    const { status } = schema.parse(req.body);
    const action = await db.action.findFirst({ where: { id: req.params.id, installationId: req.installationId! } });
    if (!action) return res.status(404).json({ error: { code: "not_found", message: "Action not found" } });
    const updated = await db.action.update({ where: { id: action.id }, data: { status, ackedAt: new Date() } });
    res.json({ action: updated });
  } catch (e) { next(e); }
});

export default r;
