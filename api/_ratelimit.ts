// Best-effort, single-instance rate limiter for endpoints with no user auth.
// Not a substitute for real gateway rate limiting at scale, but enough to
// stop casual abuse of an API key on a personal deployment.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 12
const hits = new Map<string, number[]>()

export function isRateLimited(ip: string, max = MAX_PER_WINDOW): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 1000) hits.clear() // bound memory growth across many distinct IPs
  return recent.length > max
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || 'unknown'
}
