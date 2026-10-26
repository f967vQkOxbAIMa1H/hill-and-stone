// End-to-end test for SEO files, error pages, admin portfolio/reviews, balance requests,
// the quote-expiry job and GA4 privacy. Same server setup as e2e-quote.mjs, plus:
//   CRON_SECRET=... on the server, and (optionally) a build with NEXT_PUBLIC_GA_MEASUREMENT_ID set.
//   BASE_URL=http://localhost:3100 CRON_SECRET=... node scripts/e2e-content.mjs
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { config } from "dotenv";
import pg from "pg";
import puppeteer from "puppeteer-core";

config({ quiet: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots/content";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const ADMIN_EMAIL = "e2e.content@hillstone.com";
const ADMIN_PASSWORD = `e2e-${randomBytes(9).toString("base64url")}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// Every suite signs in and submits forms from the same local address, and rate limits now persist in the
// database, so start each run with fresh counters (local test database only).
await db.query(`delete from "RateLimitHit"`);

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function png(w, h, rgb) {
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(body)); return Buffer.concat([l, body, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

execFileSync("npx", ["tsx", "scripts/admin-user.ts", ADMIN_EMAIL, "E2E Content"], { env: { ...process.env, ADMIN_PASSWORD }, stdio: "ignore" });
await mkdir(SHOTS, { recursive: true });
const fixtures = path.join(SHOTS, "fixtures");
await mkdir(fixtures, { recursive: true });
const beforePng = path.join(fixtures, "porch-before.png");
const afterPng = path.join(fixtures, "porch-after.png");
await writeFile(beforePng, png(800, 600, [120, 95, 70]));
await writeFile(afterPng, png(800, 600, [225, 230, 235]));
const title = `Porch column repair ${randomBytes(2).toString("hex")}`;

const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle0" });
const shot = (name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
const text = () => page.evaluate(() => document.body.innerText);
async function fill(selector, value) {
  await page.click(selector, { count: 3 });
  await page.keyboard.press("Backspace");
  if (value) await page.type(selector, value);
}
// Pages are cached for up to an hour; admin changes must revalidate them immediately.
async function publicText(p) {
  const res = await fetch(BASE + p);
  // React separates adjacent text with <!-- --> in server HTML; drop it so phrases match.
  return (await res.text()).replaceAll("<!-- -->", "");
}
/** Public pages normally update at once; allow up to the 60s cache ceiling for a rebuild race. */
async function publicTextUntil(p, predicate, timeoutMs = 75_000) {
  const start = Date.now();
  let html = await publicText(p);
  while (!predicate(html) && Date.now() - start < timeoutMs) {
    await sleep(2000);
    html = await publicText(p);
  }
  return { html, waited: Math.round((Date.now() - start) / 1000) };
}

try {
  // ── SEO files, icons, error pages ─────────────────────────────────────────
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check("robots.txt blocks admin, API and quote links", ["Disallow: /admin", "Disallow: /api/", "Disallow: /quote/"].every((l) => robots.includes(l)) && robots.includes("Sitemap:"));
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check("sitemap lists public pages only", ["/services", "/request-a-quote", "/trust"].every((p) => sitemap.includes(p)) && !["/admin", "/quote/", "/our-work"].some((p) => sitemap.includes(p)));
  const icon = await fetch(`${BASE}/icon.svg`);
  const apple = await fetch(`${BASE}/apple-icon`);
  const og = await fetch(`${BASE}/opengraph-image`);
  check("favicon, apple icon and social image are served", icon.ok && apple.headers.get("content-type") === "image/png" && og.headers.get("content-type") === "image/png", `${icon.status} ${apple.status} ${og.status}`);
  const home = await publicText("/");
  const ld = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? "{}");
  check("home has LocalBusiness data with service areas", ld["@type"] === "HomeAndConstructionBusiness" && ld.areaServed?.length >= 4);
  check("the business phone is in structured data", ld.telephone === "+18704211331", ld.telephone);
  check("social preview tags are set", /property="og:image"/.test(home) && /name="twitter:card" content="summary_large_image"/.test(home));
  const missing = await fetch(`${BASE}/this-page-does-not-exist`);
  const missingBody = await missing.text();
  check("unknown pages return a branded 404", missing.status === 404 && missingBody.includes("We can&#x27;t find that page") && missingBody.includes("Request an Estimate"));
  await go("/this-page-does-not-exist");
  await shot("404");

  // ── GA4 privacy (only when the build has a measurement ID) ────────────────
  const gaBuilt = home.includes("googletagmanager.com/gtag/js");
  if (gaBuilt) {
    const quotes = JSON.parse(execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], { env: { ...process.env, NEXT_PUBLIC_APP_URL: BASE }, encoding: "utf8" }).trim().split("\n").pop());
    await page.goto(quotes["open-full"], { waitUntil: "networkidle0" });
    await sleep(1000);
    const layer = await page.evaluate(() => JSON.stringify(window.dataLayer ?? []));
    const token = quotes["open-full"].split("/quote/")[1];
    check("GA4 page views never include the quote token", layer.includes("/quote/[token]") && !layer.includes(token));
  } else {
    console.log("SKIP  GA4 privacy check (build without NEXT_PUBLIC_GA_MEASUREMENT_ID)");
  }

  // ── Sign in ──────────────────────────────────────────────────────────────
  await go("/admin/login");
  await page.type("#email", ADMIN_EMAIL);
  await page.type("#password", ADMIN_PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  if (gaBuilt) check("GA4 isn't loaded in the admin", !(await page.evaluate(() => !!document.querySelector('script[src*="googletagmanager"]'))));

  // ── Portfolio: create, upload, publish ───────────────────────────────────
  await go("/admin/portfolio/new");
  await page.click("main button[type=submit]");
  await page.waitForFunction(() => document.querySelectorAll("[aria-invalid=true]").length >= 3);
  check("project form validates required fields", true);
  await fill("#title", title);
  await page.select("#category", "EXTERIOR_REPAIRS");
  await fill("#city", "Rogers");
  await fill("#summary", "Two porch columns had rotted at the base.");
  await fill("#scopeOfWork", "Replaced both column bases and wrapped them in PVC so they won't rot again.");
  await fill("#materials", "PVC column wrap\nStructural screws");
  await fill("#durationDays", "2");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("main button[type=submit]")]);
  const projectId = page.url().split("/admin/portfolio/")[1]?.split("?")[0];
  check("project is created as a draft", (await text()).includes("Project created as a draft"), projectId);

  const uploadAs = async (role, file) => {
    await page.select("#upload-role", role);
    const input = await page.$("#project-photo-input");
    await input.uploadFile(file);
    await page.waitForFunction((r) => document.body.innerText.includes(`added as ${r}`), {}, role);
    await sleep(600);
  };
  await uploadAs("before", beforePng);
  await uploadAs("after", afterPng);
  await page.waitForFunction(() => document.querySelectorAll("ul[aria-label='Project photos'] img").length === 2);
  const widths = await page.$$eval("ul[aria-label='Project photos'] img", (imgs) => imgs.map((i) => i.naturalWidth));
  check("before and after photos upload and preview", widths.every((w) => w === 800), widths.join(","));
  check("photo manager reports the slider is ready", (await text()).includes("Before and after are set"));

  const draftWork = await publicText("/our-work");
  check("draft projects stay off the public site", !draftWork.includes(title));
  await page.click("#published");
  await page.click("#featured");
  await page.click("button::-p-text(Save changes)");
  await page.waitForFunction(() => document.body.innerText.includes("Changes are live"));
  await shot("portfolio-edit");

  const slug = (await db.query(`select slug from "Project" where id=$1`, [projectId])).rows[0].slug;
  const work = await publicTextUntil("/our-work", (h) => h.includes(title));
  check("published project appears on Our Work", work.html.includes(title), `after ${work.waited}s`);
  await go(`/our-work?project=${slug}`);
  await page.waitForFunction(() => document.querySelector("dialog.project-dialog")?.open);
  await sleep(400);
  const sliderImgs = await page.$$eval("dialog.project-dialog figure img", (imgs) => imgs.map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth })));
  check("the project's before/after slider loads the uploaded photos", sliderImgs.length === 2 && sliderImgs.every((i) => i.w > 0), sliderImgs.map((i) => i.w).join(","));
  await shot("our-work-dialog", false);
  const mediaUrl = sliderImgs[0]?.src ?? "";
  const directKey = (await db.query(`select "storageKey" from "ProjectImage" where "projectId"=$1 limit 1`, [projectId])).rows[0].storageKey;
  const direct = await fetch(`${BASE}/media/${directKey}`);
  check("published photos are served from /media", direct.ok && direct.headers.get("content-type") === "image/jpeg" /* shrunk to JPEG in the browser */, mediaUrl.slice(0, 60));

  // ── Reviews: permission rule, publish, unpublish ─────────────────────────
  await go("/admin/reviews/new");
  const reviewText = `Great work on the porch columns ${randomBytes(2).toString("hex")}. Showed up on time and cleaned up.`;
  await page.type("#body", reviewText);
  await page.type("#authorName", "Dana R.");
  await page.type("#city", "Rogers");
  await page.select("#projectId", projectId);
  await page.click("#published");
  await page.click("main button[type=submit]");
  await page.waitForFunction(() => document.body.innerText.includes("Confirm you have the customer's permission"));
  check("publishing a review requires customer permission", true);
  await page.click("#permission");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("main button[type=submit]")]);
  check("review is saved and live", (await text()).includes("It's live on the site"));
  let r = await publicTextUntil("/reviews", (h) => h.includes(`See the project: ${title}`));
  let reviews = r.html;
  check("review shows on the Reviews page with its project link", reviews.includes("Great work on the porch columns") && reviews.includes(`See the project: ${title}`), `after ${r.waited}s`);
  await page.click("#published");
  await page.click("button::-p-text(Save changes)");
  await page.waitForFunction(() => document.body.innerText.includes("hidden from the site"));
  r = await publicTextUntil("/reviews", (h) => !h.includes(reviewText.slice(0, 40)));
  check("unpublishing hides the review", !r.html.includes(reviewText.slice(0, 40)), `after ${r.waited}s`);
  await go("/admin/reviews");
  await shot("reviews-admin");

  // ── Mark complete and request payment (payment is due on completion) ───
  const samples = JSON.parse(execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], { env: { ...process.env, NEXT_PUBLIC_APP_URL: BASE }, encoding: "utf8" }).trim().split("\n").pop());
  const qid = async (k) => (await db.query(`select id from "Quote" where "publicToken"=$1`, [samples[k].split("/quote/")[1]])).rows[0].id;
  const acceptedId = await qid("accepted");
  await go(`/admin/quotes/${await qid("open-full")}`);
  check("no payment request before the client accepts", !(await text()).includes("Mark complete and request payment"));
  await go(`/admin/quotes/${acceptedId}`);
  await page.click("button::-p-text(Mark complete and request payment)");
  await page.waitForSelector("#bill-note");
  const total = (await db.query(`select "totalCents", number from "Quote" where id=$1`, [acceptedId])).rows[0];
  const due = `$${(total.totalCents / 100).toFixed(2)}`;
  check("payment request confirms amount and recipient", (await text()).includes(`ask sample.customer@example.com to pay ${due}?`) || (await text()).includes(`to pay ${due}?`));
  await page.type("#bill-note", "Thanks again. Extra paint is in the garage.");
  await page.click("button::-p-text(Send request for)");
  await page.waitForFunction(() => /Payment request for|didn't send/.test(document.body.innerText));
  const requested = (await db.query(`select "paymentRequestedAt" from "Quote" where id=$1`, [acceptedId])).rows[0];
  check("marking complete opens payment", !!requested.paymentRequestedAt);
  await go(`/admin/quotes/${acceptedId}`);
  check("history logs the payment request", (await text()).includes(`Job complete, payment requested: ${due}`));
  check("button becomes a reminder", (await text()).includes("Resend payment request"));
  const billEmail = (await db.query(`select subject from "EmailLog" where "quoteId"=$1 and type='BALANCE_REQUEST'`, [acceptedId])).rows[0];
  check("payment email is dispatched", billEmail?.subject === `Your job is complete: ${due} due for quote #${total.number}`, billEmail?.subject);
  const portal = await (await fetch(samples.accepted)).text();
  check("client can now pay", portal.includes("Payment due"));
  await shot("payment-request");

  // ── Expiry job ───────────────────────────────────────────────────────────
  const expiredId = await qid("expired");
  const noAuth = await fetch(`${BASE}/api/cron/expire-quotes`);
  check("expiry job rejects calls without the secret", noAuth.status === 401 || noAuth.status === 503, String(noAuth.status));
  if (CRON_SECRET) {
    const run = await fetch(`${BASE}/api/cron/expire-quotes`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    const body = await run.json();
    const after = (await db.query(`select status from "Quote" where id=$1`, [expiredId])).rows[0].status;
    const events = (await db.query(`select count(*)::int n from "QuoteEvent" where "quoteId"=$1 and type='EXPIRED'`, [expiredId])).rows[0].n;
    check("expiry job marks overdue quotes EXPIRED once", run.ok && body.expired >= 1 && after === "EXPIRED" && events === 1, JSON.stringify(body));
    const again = await (await fetch(`${BASE}/api/cron/expire-quotes`, { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json();
    check("running it again changes nothing", again.expired === 0, JSON.stringify(again));
    const openStill = (await db.query(`select status from "Quote" where id=$1`, [await qid("open")])).rows[0].status;
    check("quotes still in date are untouched", openStill === "SENT", openStill);
  }

  // ── Delete the project ───────────────────────────────────────────────────
  await go(`/admin/portfolio/${projectId}`);
  await page.click("button::-p-text(Delete project)");
  await page.waitForSelector("#del-h");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("[role=alertdialog] button::-p-text(Delete project)")]);
  const gone = (await publicTextUntil("/our-work", (h) => !h.includes(title))).html;
  const orphan = await fetch(`${BASE}/media/${directKey}`);
  check("deleting a project removes it and its photos", !gone.includes(title) && orphan.status === 404);
} catch (error) {
  check("script completed", false, error.stack?.split("\n").slice(0, 3).join(" | "));
  await shot("failure").catch(() => {});
} finally {
  await browser.close();
  await db.query(`delete from "Testimonial" where "authorName"='Dana R.' and body like 'Great work on the porch columns%'`);
  await db.query(`delete from "Session" where "userId" in (select id from "User" where email=$1)`, [ADMIN_EMAIL]);
  await db.end();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
