import Redis from "ioredis";
import { env } from "./env.js";
export const redis = new Redis(env.REDIS_URL, { lazyConnect: false });
export const pub   = new Redis(env.REDIS_URL);
export const sub   = new Redis(env.REDIS_URL);
export const channel = (instId: string) => `aurora:installation:${instId}`;
