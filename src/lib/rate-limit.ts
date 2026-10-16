import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Rate limiter shared by every server instance, so it holds on serverless hosts where instances come and
 * go. Counts live in Postgres (RateLimitHit) per fixed window, incremented atomically by an upsert, and
 * the previous window's count is blended in so a burst straddling a window boundary can't get double.
 * If the database is unreachable it falls back to a per-instance in-memory limiter rather than failing.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  const hashed = createHash("sha256").update(key).digest("base64url");
  try {
    const [current, previous] = await Promise.all([
      db.rateLimitHit.upsert({
        where: { key_windowStart: { key: hashed, windowStart: new Date(start) } },
        create: { key: hashed, windowStart: new Date(start), expiresAt: new Date(start + 2 * windowMs) },
        update: { count: { increment: 1 } },
        select: { count: true },
      }),
      db.rateLimitHit.findUnique({ where: { key_windowStart: { key: hashed, windowStart: new Date(start - windowMs) } }, select: { count: true } }),
    ]);
    // Occasional cleanup; the daily cron job also clears expired rows.
    if (Math.random() < 0.01) void pruneRateLimits().catch(() => {});
    return slidingEstimate(previous?.count ?? 0, current.count, (now - start) / windowMs) <= limit;
  } catch (error) {
    console.error("rateLimit: database unavailable, using the in-memory fallback", error);
    return memoryLimit(key, limit, windowMs);
  }
}

/** Hits in the last full window's length: this window's, plus the previous window's still-overlapping share. */
export function slidingEstimate(previousCount: number, currentCount: number, elapsedFraction: number) {
  return currentCount + previousCount * (1 - Math.min(1, Math.max(0, elapsedFraction)));
}

export const pruneRateLimits = () => db.rateLimitHit.deleteMany({ where: { expiresAt: { lt: new Date() } } });

// ─── In-memory fallback ─────────────────────────────────────────────────────
// Sliding window per process: each key keeps the timestamps of its recent hits.
const hits = new Map<string, { times: number[]; windowMs: number }>();
const MAX_KEYS = 10_000;

function memoryLimit(key: string, limit: number, windowMs: number) {
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

/**
 * The caller's IP, for rate limits and audit logs. Never trust the leftmost X-Forwarded-For entry:
 * the client writes it, so rotating it would slip past every rate limit.
 * - Netlify sets x-nf-client-connection-ip and Vercel sets x-vercel-forwarded-for; clients can't forge either.
 * - Behind one reverse proxy (nginx, Caddy, a load balancer), the proxy appends the address it saw as
 *   the last X-Forwarded-For entry, so that's the one to use.
 */
export function clientIp(headers: Headers) {
  const platform = headers.get("x-nf-client-connection-ip") ?? headers.get("x-vercel-forwarded-for")?.split(",")[0];
  if (platform?.trim()) return platform.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
