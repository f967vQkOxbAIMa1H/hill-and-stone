// Runs the quote-expiry job against a running site. For hosts without Vercel Cron, add to crontab:
//   0 6 * * *  cd /path/to/app && npm run quotes:expire
import { config } from "dotenv";
config({ quiet: true });

async function main() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!process.env.CRON_SECRET) throw new Error("Set CRON_SECRET (same value as the running site).");
  const res = await fetch(`${base}/api/cron/expire-quotes`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  console.log(body);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
