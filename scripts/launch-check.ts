// Pre-launch checklist: business settings, environment and database content.
// Usage: npm run check:launch            (reads .env)
//        npm run check:launch -- --env .env.production
// Exits 1 if anything blocks launch.
import { config } from "dotenv";
const envFile = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : ".env";
config({ path: envFile, quiet: true });
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { business, quoteDefaults } from "../src/lib/site";

type Item = { level: "block" | "warn"; area: string; message: string };
const items: Item[] = [];
const block = (area: string, message: string) =>
  items.push({ level: "block", area, message });
const warn = (area: string, message: string) =>
  items.push({ level: "warn", area, message });

// ── Business settings (src/lib/site.ts) ─────────────────────────────────────
const phoneDigits = business.contact.phone.replace(/\D/g, "");
if (/555(01\d\d)$/.test(phoneDigits))
  block(
    "settings",
    `Phone ${business.contact.phone} is a fictional 555-01xx number (business.contact.phone).`,
  );
if (!business.license.number)
  warn(
    "settings",
    "License number isn't set (business.license.number). The site says “licensed” without a number.",
  );
if (!business.insurance.some((i) => i.detail))
  warn(
    "settings",
    "No insurance details set (business.insurance). The Trust page offers a certificate on request instead.",
  );
if (!business.googleReviewsUrl)
  warn(
    "settings",
    "Google review link isn't set (business.googleReviewsUrl). Review buttons are hidden.",
  );
const missingStory = Object.entries(business.story)
  .filter(([, v]) => v == null)
  .map(([k]) => k);
if (missingStory.length)
  warn(
    "settings",
    `About page story is missing: ${missingStory.join(", ")} (business.story). Those sentences are left out.`,
  );
const missingPhotos = Object.entries(business.photos)
  .filter(([, v]) => v == null)
  .map(([k]) => k);
if (missingPhotos.length)
  warn(
    "settings",
    `About page photos not set: ${missingPhotos.join(", ")} (business.photos). A brand graphic shows instead.`,
  );
if (!business.policies.confirmed)
  block(
    "settings",
    "Policies not confirmed: review FAQ (src/lib/faq.ts), Trust page and email wording, then set business.policies.confirmed = true.",
  );
if (!quoteDefaults.confirmed)
  block(
    "settings",
    "Quote defaults not confirmed: check trip fee, tax rate and deposit, then set quoteDefaults.confirmed = true.",
  );

// ── Environment ─────────────────────────────────────────────────────────────
const env = process.env;
const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CONTRACTOR_NOTIFY_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];
for (const key of required)
  if (!env[key]?.trim()) block("env", `${key} is not set (${envFile}).`);
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
if (
  appUrl &&
  (!appUrl.startsWith("https://") || /localhost|127\.0\.0\.1/.test(appUrl))
)
  block(
    "env",
    `NEXT_PUBLIC_APP_URL is ${appUrl}; quote links in emails need your public https:// address.`,
  );
if (env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
  warn(
    "env",
    "STRIPE_SECRET_KEY is a test key. Switch to the live key (sk_live_...) to take real payments.",
  );
if (env.STRIPE_API_HOST)
  block(
    "env",
    "STRIPE_API_HOST is set; that routes payments to stripe-mock. Remove it in production.",
  );
if (env.EMAIL_FROM?.includes("resend.dev"))
  warn(
    "env",
    "EMAIL_FROM uses resend.dev; verify your own domain in Resend so emails don't land in spam.",
  );
if (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL ?? ""))
  warn("env", "DATABASE_URL points at a local database.");

// ── Database content ────────────────────────────────────────────────────────
async function checkDatabase() {
  if (!env.DATABASE_URL) return;
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    const [
      sampleProjects,
      seedReviews,
      testCustomers,
      admins,
      publishedProjects,
    ] = await Promise.all([
      db.project.count({ where: { slug: { startsWith: "sample-" } } }),
      db.testimonial.count({ where: { source: "seed" } }),
      db.customer.count({ where: { email: { endsWith: "@example.com" } } }),
      db.user.count({
        where: {
          role: { in: ["OWNER", "ADMIN", "STAFF"] },
          passwordHash: { not: null },
          email: { not: { startsWith: "e2e." } },
        },
      }),
      db.project.count({
        where: { published: true, slug: { not: { startsWith: "sample-" } } },
      }),
    ]);
    if (sampleProjects || seedReviews || testCustomers) {
      block(
        "data",
        `Sample/test data present: ${sampleProjects} sample projects, ${seedReviews} placeholder reviews, ${testCustomers} @example.com customers. Run: npm run db:clean-samples -- --yes`,
      );
    }
    if (!admins)
      block(
        "data",
        'No admin login. Run: npm run admin:user -- you@yourdomain.com "Your Name"',
      );
    if (!publishedProjects)
      warn(
        "data",
        "No real portfolio projects yet. Our Work shows an empty state; the home hero shows a brand graphic.",
      );
  } catch (e) {
    block(
      "data",
      `Couldn't reach the database: ${(e as Error).message.split("\n")[0]}`,
    );
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  await checkDatabase();
  report();
}

function report() {
  const blocks = items.filter((i) => i.level === "block");
  const warns = items.filter((i) => i.level === "warn");
  for (const [title, list, mark] of [
    ["Must fix before launch", blocks, "✗"],
    ["Worth doing", warns, "!"],
  ] as const) {
    if (!list.length) continue;
    console.log(`\n${title}`);
    for (const i of list) console.log(`  ${mark} [${i.area}] ${i.message}`);
  }
  console.log(
    blocks.length
      ? `\n${blocks.length} blocker(s), ${warns.length} warning(s).`
      : `\nReady to launch. ${warns.length} warning(s).`,
  );
  process.exit(blocks.length ? 1 : 0);
}

main();
