import "dotenv/config";
export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  RATE_LIMIT_PER_MIN: Number(process.env.RATE_LIMIT_PER_MIN ?? 120),
};
