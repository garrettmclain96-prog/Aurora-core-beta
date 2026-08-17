import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";

declare global {
  namespace Express {
    interface Request {
      installationId?: string;
      apiKeyId?: string;
      apiKeyPrefix?: string;
    }
  }
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: "missing_key", message: "Authorization: Bearer <key> required" } });

  const hashed = createHash("sha256").update(token).digest("hex");
  const key = await db.apiKey.findUnique({ where: { hashedKey: hashed } });
  if (!key || key.revokedAt) return res.status(401).json({ error: { code: "invalid_key", message: "API key invalid or revoked" } });
  if (!key.installationId)   return res.status(400).json({ error: { code: "no_installation", message: "Key not bound to an installation" } });

  req.installationId = key.installationId;
  req.apiKeyId = key.id;
  req.apiKeyPrefix = key.prefix;
  db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  next();
}
