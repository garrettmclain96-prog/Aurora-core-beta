import { WebSocketServer } from "ws";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import { db } from "./db.js";
import { sub, channel } from "./redis.js";
import { log } from "./log.js";

export function attachWs(server: Server) {
  const wss = new WebSocketServer({ server, path: "/v1/stream" });

  // Subscribe once, fan out per-installation
  const subscribers = new Map<string, Set<any>>();
  sub.psubscribe("aurora:installation:*");
  sub.on("pmessage", (_p, ch, msg) => {
    const set = subscribers.get(ch);
    if (!set) return;
    for (const s of set) try { s.send(msg); } catch {}
  });

  wss.on("connection", async (socket, req) => {
    const url = new URL(req.url ?? "", "http://x");
    const token = url.searchParams.get("api_key") ?? "";
    const hashed = createHash("sha256").update(token).digest("hex");
    const key = await db.apiKey.findUnique({ where: { hashedKey: hashed } });
    if (!key || key.revokedAt || !key.installationId) { socket.close(1008, "unauthorized"); return; }

    const ch = channel(key.installationId);
    if (!subscribers.has(ch)) subscribers.set(ch, new Set());
    subscribers.get(ch)!.add(socket);
    socket.send(JSON.stringify({ type: "hello", installationId: key.installationId }));
    log.info({ installationId: key.installationId }, "ws_connected");

    socket.on("close", () => subscribers.get(ch)?.delete(socket));
  });
}
