import http from "node:http";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./env.js";
import { log } from "./log.js";
import v1 from "./routes/v1.js";
import { errorHandler, notFound } from "./errors.js";
import { attachWs } from "./ws.js";
import { redis } from "./redis.js";
import { db } from "./db.js";

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*", methods: ["GET","POST","PATCH","DELETE","OPTIONS"] }));
app.use(express.json({ limit: "512kb" }));
app.use(pinoHttp({ logger: log, redact: ["req.headers.authorization"] }));

/** Health — checks DB + Redis connectivity */
app.get("/health", async (_, res) => {
  const checks: Record<string, string> = {};
  try { await redis.ping(); checks.redis = "ok"; } catch { checks.redis = "error"; }
  try { await db.$queryRaw`SELECT 1`; checks.db = "ok"; } catch { checks.db = "error"; }
  const healthy = Object.values(checks).every(v => v === "ok");
  res.status(healthy ? 200 : 503).json({ ok: healthy, ts: Date.now(), checks, version: "2.0.0" });
});

/** Metrics — Prometheus-compatible text */
app.get("/metrics", async (_, res) => {
  const [eventCount, insightCount, actionCount] = await Promise.all([
    db.event.count().catch(() => 0),
    db.insight.count().catch(() => 0),
    db.action.count().catch(() => 0),
  ]);
  res.type("text/plain").send([
    "# HELP aurora_events_total Total events ingested",
    "# TYPE aurora_events_total counter",
    `aurora_events_total ${eventCount}`,
    "# HELP aurora_insights_total Total insights generated",
    "# TYPE aurora_insights_total counter",
    `aurora_insights_total ${insightCount}`,
    "# HELP aurora_actions_total Total actions generated",
    "# TYPE aurora_actions_total counter",
    `aurora_actions_total ${actionCount}`,
    "# HELP aurora_up Service health",
    "# TYPE aurora_up gauge",
    "aurora_up 1",
  ].join("\n") + "\n");
});

app.use("/v1", v1);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
attachWs(server);

server.listen(env.PORT, () => log.info({ port: env.PORT, version: "2.0.0" }, "aurora_api_listening"));

// Graceful shutdown
process.on("SIGTERM", async () => {
  log.info("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
});
