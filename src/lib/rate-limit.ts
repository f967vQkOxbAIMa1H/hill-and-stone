import "server-only";

// Sliding-window limiter held in memory: each key keeps the timestamps of its recent hits, and a
// request is allowed while fewer than `limit` fall inside the last `windowMs`. Good enough for a
// single instance; swap for Redis/Upstash when running more than one server.
const hits = new Map<string, { times: number[]; windowMs: number }>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > MAX_KEYS) prune(now);
  const recent = (hits.get(key)?.times ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, { times: recent, windowMs });
    return false;
  }
  recent.push(now);
  hits.set(key, { times: recent, windowMs });
  return true;
}

/** Drops keys whose hits have all aged out, so a flood of one-off IPs can't grow memory without bound. */
function prune(now: number) {
  for (const [key, { times, windowMs }] of hits) {
    if (!times.some((t) => now - t < windowMs)) hits.delete(key);
  }
  // Still over the cap (a burst of distinct keys inside the window): drop the oldest-inserted.
  for (const key of hits.keys()) {
    if (hits.size <= MAX_KEYS) break;
    hits.delete(key);
  }
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
