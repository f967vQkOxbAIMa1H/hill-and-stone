import "server-only";
import { getConnectionString } from "@netlify/database";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// One client per server process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * On Netlify, Netlify Database picks the right branch for this deploy (production, or a preview's own
 * copy) and wins over DATABASE_URL, so a stray local .env can never point a deploy at localhost.
 * Everywhere else, DATABASE_URL is required.
 */
function connectionString() {
  if (process.env.NETLIFY_DB_URL) return getConnectionString();
  if (env.DATABASE_URL) return env.DATABASE_URL;
  throw new Error("DATABASE_URL is not set (and this isn't running on Netlify with Netlify Database).");
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: connectionString() });
  return new PrismaClient({ adapter });
}

function client() {
  return (globalForPrisma.prisma ??= createClient());
}

/**
 * Connects on first use, not at import, so a build without database credentials still renders
 * (content queries fall back to defaults) instead of crashing when a page imports this module.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_, key) {
    const c = client();
    const value = Reflect.get(c, key);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
