import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { expireOverdueQuotes } from "@/lib/quotes/expire";
import { pruneRateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Called daily by Vercel Cron (vercel.json), the Netlify scheduled function (netlify/functions/expire-quotes.mts),
// or `npm run quotes:expire` from a server crontab.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await expireOverdueQuotes();
  // Daily housekeeping: drop rate-limit counters whose windows have passed.
  const pruned = await pruneRateLimits().then((r) => r.count, () => null);
  console.info("[cron] rate limits pruned", pruned);
  console.info("[cron] expire-quotes", result);
  return NextResponse.json(result);
}
