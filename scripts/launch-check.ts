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
import { brand, defaultSettings, isPlaceholderPhone } from "../src/lib/site";
import { settingsSchema, type Settings } from "../src/lib/settings/schema";

type Item = { level: "block" | "warn"; area: string; message: string };
const items: Item[] = [];
const block = (area: string, message: string) =>
  items.push({ level: "block", area, message });
const warn = (area: string, message: string) =>
  items.push({ level: "warn", area, message });

// ── Business settings (saved in the admin, over the defaults in src/lib/site.ts) ──
function checkSettings(settings: Settings) {
  if (isPlaceholderPhone(settings.contact.phone))
    block("settings", `Phone ${settings.contact.phone} is a fictional 555-01xx number. Set it at /admin/settings/site.`);
  if (!settings.license.showPublicly)
    warn("settings", "License number and insurance details are hidden (waiting on the LLC). Once registered, fill them in and tick “Show license number and insurance details” at /admin/settings/site.");
  else {
    if (!settings.license.number) warn("settings", "License details are public but no license number is set (/admin/settings/site).");
    if (!settings.insurance.some((i) => i.detail))
      warn("settings", "No insurance details set (/admin/settings/site). The Trust page offers a certificate on request instead.");
  }
  if (!brand.domainConfirmed)
    warn("brand", `Domain is a placeholder (${brand.domain}). Buy the Hillstone domain, then set brand.domain in src/lib/site.ts and NEXT_PUBLIC_APP_URL.`);
  if (settings.contact.email === defaultSettings.contact.email)
    block("settings", `Contact email is still the default ${settings.contact.email}. Set the business inbox at /admin/settings/site.`);
  if (!settings.googleReviewsUrl) warn("settings", "Google review link isn't set (/admin/settings/site). Review buttons are hidden.");
  const missingStory = Object.entries(settings.story).filter(([, v]) => v == null).map(([k]) => k);
  if (missingStory.length) warn("settings", `About page story is missing: ${missingStory.join(", ")} (/admin/settings/site).`);
  const missingPhotos = (["founder", "coFounder"] as const).filter((k) => brand.photos[k] == null);
  if (missingPhotos.length) warn("settings", `Our Story founder photos not set: ${missingPhotos.join(", ")} (brand.photos in src/lib/site.ts). Their frames show a brand graphic until then.`);
  if (!settings.policies.confirmed)
    block("settings", "Policies not confirmed: review the FAQ, Trust page and email wording, then tick “Policies confirmed” at /admin/settings/site.");
  if (!settings.quoteDefaults.confirmed)
    block("settings", "Quote defaults not confirmed: check trip fee and tax rate, then tick “Pricing confirmed” at /admin/settings/site.");
}

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
  "CRON_SECRET",
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
if (env.SHOW_SAMPLE_CONTENT === "1")
  block("env", "SHOW_SAMPLE_CONTENT=1 shows placeholder projects and reviews on the public site. Remove it.");
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
if ((env.STORAGE_DRIVER ?? "local") === "local")
  warn(
    "env",
    "Uploads are stored on local disk (STORAGE_DRIVER=local). Fine on a server with a persistent disk; use STORAGE_DRIVER=s3 on Vercel or other serverless hosts.",
  );
if (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL ?? ""))
  warn("env", "DATABASE_URL points at a local database.");

// ── Database content ────────────────────────────────────────────────────────
async function checkDatabase() {
  if (!env.DATABASE_URL) return checkSettings(defaultSettings);
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  try {
    const row = await db.siteSettings.findUnique({ where: { id: "site" } });
    const saved = row ? settingsSchema.safeParse({ ...defaultSettings, ...(row.data as object) }) : null;
    checkSettings(saved?.success ? saved.data : defaultSettings);
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
