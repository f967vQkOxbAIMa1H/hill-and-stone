// Removes sample and test data, keeping real customers, quotes and settings.
// Safe to run against production. Dry run by default.
// Usage: npm run db:clean-samples            (shows what would be removed)
//        npm run db:clean-samples -- --yes   (removes it)
//
// Removed: sample portfolio projects (slug "sample-*"), placeholder reviews (source "seed"),
// test customers (@example.com) with their requests, quotes, payments and uploaded photos,
// and test admin logins (e2e.*@, probe@).
import { config } from "dotenv";
config({ quiet: true });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const apply = process.argv.includes("--yes");

async function main() {
  const testCustomers = await db.customer.findMany({ where: { email: { endsWith: "@example.com" } }, select: { id: true } });
  const customerIds = testCustomers.map((c) => c.id);
  const quoteIds = (await db.quote.findMany({ where: { customerId: { in: customerIds } }, select: { id: true } })).map((q) => q.id);
  const leadIds = (await db.lead.findMany({ where: { customerId: { in: customerIds } }, select: { id: true } })).map((l) => l.id);
  const files = await db.attachment.findMany({ where: { leadId: { in: leadIds } }, select: { storageKey: true } });

  const counts = {
    "sample projects": await db.project.count({ where: { slug: { startsWith: "sample-" } } }),
    "placeholder reviews": await db.testimonial.count({ where: { source: "seed" } }),
    "test customers": customerIds.length,
    "their requests": leadIds.length,
    "their quotes": quoteIds.length,
    "their photos": files.length,
    "test admin logins": await db.user.count({ where: { OR: [{ email: { startsWith: "e2e." } }, { email: { startsWith: "probe@" } }] } }),
  };
  console.log(apply ? "Removing:" : "Would remove (dry run; add --yes to delete):");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${String(v).padStart(4)} ${k}`);
  if (!apply) return;

  await db.$transaction(async (tx) => {
    // Order matters: payments reference quotes without cascade.
    await tx.payment.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await tx.emailLog.deleteMany({ where: { OR: [{ quoteId: { in: quoteIds } }, { leadId: { in: leadIds } }] } });
    await tx.conversionEvent.deleteMany({ where: { OR: [{ quoteId: { in: quoteIds } }, { leadId: { in: leadIds } }] } });
    await tx.quote.deleteMany({ where: { id: { in: quoteIds } } }); // cascades line items and events
    await tx.lead.deleteMany({ where: { id: { in: leadIds } } }); // cascades attachments and notes
    await tx.customer.deleteMany({ where: { id: { in: customerIds } } }); // cascades addresses
    await tx.testimonial.deleteMany({ where: { source: "seed" } });
    await tx.project.deleteMany({ where: { slug: { startsWith: "sample-" } } });
    await tx.user.deleteMany({ where: { OR: [{ email: { startsWith: "e2e." } }, { email: { startsWith: "probe@" } }] } });
  });
  // Same path guard as src/lib/storage.ts: never delete outside the storage folder.
  const root = path.join(process.cwd(), "storage");
  for (const f of files) {
    const target = path.resolve(root, f.storageKey);
    if (target.startsWith(root + path.sep)) await rm(target, { force: true });
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
