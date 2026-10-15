// Netlify scheduled function: the daily quote-expiry job (vercel.json does the same on Vercel).
// It calls the app's protected route, which holds the real logic, with CRON_SECRET as a bearer token.
// Runs only on the published production deploy; use "Run now" in the Netlify UI to test it.
import type { Config, Context } from "@netlify/functions";

export default async function expireQuotes(_req: Request, context: Context) {
  const secret = Netlify.env.get("CRON_SECRET");
  if (!secret) {
    console.error("[cron] expire-quotes: CRON_SECRET is not set");
    return;
  }
  const res = await fetch(new URL("/api/cron/expire-quotes", context.site.url), {
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`[cron] expire-quotes failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  console.info("[cron] expire-quotes", body);
}

export const config: Config = {
  // 11:00 UTC daily = 6 AM Central in summer (CDT), 5 AM in winter (CST). Same as vercel.json.
  schedule: "0 11 * * *",
};
