import type { Request, Response, NextFunction } from "express";
import { redis } from "./redis.js";
import { env } from "./env.js";

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const id = req.apiKeyId ?? req.ip ?? "anon";
  const key = `rl:${id}:${Math.floor(Date.now() / 60_000)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 65);
  res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_PER_MIN);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, env.RATE_LIMIT_PER_MIN - n));
  if (n > env.RATE_LIMIT_PER_MIN) {
    return res.status(429).json({ error: { code: "rate_limited", message: "Too many requests" } });
  }
  next();
}
