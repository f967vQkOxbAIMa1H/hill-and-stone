// Development only: wipes the local database and uploaded files, re-applies migrations
// and loads sample content. Refuses to run against anything but a local database.
// Usage: npm run db:reset
import { config } from "dotenv";
config({ quiet: true });
import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();

if (!["localhost", "127.0.0.1", "::1"].includes(host) || process.env.NODE_ENV === "production") {
  console.error(`Refusing to reset: DATABASE_URL host is "${host || "unset"}". db:reset only runs against a local database.`);
  console.error("To remove sample data from a real database, use: npm run db:clean-samples -- --yes");
  process.exit(1);
}

async function main() {
  console.log(`Resetting ${host}${new URL(url).pathname}…`);
  // Also runs the seed, with the local demo content.
  execFileSync("npx", ["prisma", "migrate", "reset", "--force"], { stdio: "inherit", env: { ...process.env, SEED_DEMO: "true" } });
  await rm(path.join(process.cwd(), "storage"), { recursive: true, force: true });
  console.log("\nLocal database reset with sample content. Create a login with: npm run admin:user -- you@example.com \"Name\"");
}

main();
