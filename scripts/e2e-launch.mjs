// End-to-end test for photo shrinking, offline payments, review invites and the shared rate limiter.
// Needs the app running with Stripe pointed at stripe-mock (see e2e-quote.mjs), plus Postgres:
//   BASE_URL=http://localhost:3100 STRIPE_WEBHOOK_SECRET=whsec_e2e node scripts/e2e-launch.mjs
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";
import puppeteer from "puppeteer-core";
import Stripe from "stripe";

config({ quiet: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots/launch";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e";
const ADMIN_EMAIL = "e2e.launch@hillstone.com";
const ADMIN_PASSWORD = `e2e-${randomBytes(9).toString("base64url")}`;
const MARK = `e2e-launch-${randomBytes(3).toString("hex")}`;
const stripe = new Stripe("sk_test_signing_only");
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
const q1 = async (sql, args = []) => (await db.query(sql, args)).rows[0];
async function until(fn, ms = 8000) {
  for (let t = 0; t < ms; t += 250) {
    const v = await fn();
    if (v) return v;
    await sleep(250);
  }
  return fn();
}

execFileSync("npx", ["tsx", "scripts/admin-user.ts", ADMIN_EMAIL, "E2E Launch"], { env: { ...process.env, ADMIN_PASSWORD }, stdio: "ignore" });
const samples = JSON.parse(
  execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], { env: { ...process.env, NEXT_PUBLIC_APP_URL: BASE }, encoding: "utf8" }).trim().split("\n").pop(),
);
const quoteOf = async (key) => q1(`select id, "leadId", "totalCents", number from "Quote" where "publicToken"=$1`, [samples[key].split("/quote/")[1]]);

await mkdir(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const go = (p, pg_ = page) => pg_.goto(BASE + p, { waitUntil: "networkidle0" });
const text = (pg_ = page) => pg_.evaluate(() => document.body.innerText);
const shot = (name, pg_ = page) => pg_.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
async function fill(selector, value, pg_ = page) {
  await pg_.click(selector, { count: 3 });
  await pg_.keyboard.press("Backspace");
  if (value) await pg_.type(selector, value);
}

try {
  // ── 1. Photos are shrunk in the browser before upload ───────────────────
  await go("/request-a-quote");
  await page.type("#firstName", "Riley");
  await page.type("#lastName", MARK);
  await page.type("#email", `riley+${MARK}@example.com`);
  await page.type("#phone", "4795550133");
  await page.click("label:has(input[name=preferredContact][value=EMAIL])");
  await page.type("#line1", "100 W Center St");
  await page.type("#city", "Fayetteville");
  await page.type("#postalCode", "72701");
  await page.click("label:has(input[name=category][value=DRYWALL_PAINTING])");
  await page.type("#description", "Water stain on the hallway ceiling and a soft patch of drywall below it.");
  await page.select("#timeline", "WITHIN_A_MONTH");
  await page.click("label:has(input[name=budgetRange][value=NOT_SURE])");
  // Three full-size "phone photos" (4032x3024, detailed enough to stay large), attached like a real pick.
  const sourceBytes = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 4032;
    c.height = 3024;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(c.width, c.height);
    const chunk = new Uint8Array(65536);
    for (let i = 0; i < img.data.length; i += chunk.length) {
      crypto.getRandomValues(chunk);
      for (let j = 0; j < chunk.length && i + j < img.data.length; j++) img.data[i + j] = (i + j) % 4 === 3 ? 255 : 90 + (chunk[j] % 90);
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
    const dt = new DataTransfer();
    for (const n of [1, 2, 3]) dt.items.add(new File([blob], `ceiling-${n}.jpg`, { type: "image/jpeg", lastModified: n }));
    const input = document.querySelector("#photos");
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return blob.size * 3;
  });
  await page.waitForFunction(() => document.querySelectorAll("ul[aria-label='Attached photos'] li").length === 3, { timeout: 60000 });
  check("three full-size photos attach and preview", true, `${(sourceBytes / 1048576).toFixed(1)} MB as chosen`);
  check("the originals would exceed the ~4.5 MB request limit", sourceBytes > 4.5 * 1048576);
  await shot("photos-attached");
  await page.click("button[type=submit]");
  await page.waitForSelector(".quote-done h2", { timeout: 30000 });
  const lead = await q1(`select l.id, l.number from "Lead" l join "Customer" c on c.id = l."customerId" where c."lastName" = $1`, [MARK]);
  const atts = (await db.query(`select "sizeBytes", "mimeType", "fileName" from "Attachment" where "leadId"=$1`, [lead?.id])).rows;
  const total = atts.reduce((s, a) => s + a.sizeBytes, 0);
  check("request with photos goes through", atts.length === 3, `#${lead?.number}, ${atts.length} photos`);
  check("each photo was shrunk to a JPEG under 600 KB", atts.every((a) => a.mimeType === "image/jpeg" && a.sizeBytes < 600 * 1024), atts.map((a) => `${Math.round(a.sizeBytes / 1024)} KB`).join(", "));
  check("the whole upload fits under 4 MB", total < 4 * 1048576, `${(total / 1048576).toFixed(2)} MB`);

  // ── Sign in as an admin ─────────────────────────────────────────────────
  await go("/admin/login");
  await page.type("#email", ADMIN_EMAIL);
  await page.type("#password", ADMIN_PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  check("admin signs in", page.url().endsWith("/admin"), page.url());

  // ── 4. Offline payments ─────────────────────────────────────────────────
  const due = await quoteOf("payment-due");
  await go(`/admin/quotes/${due.id}`);
  await page.click("button::-p-text(Record cash or check payment)");
  await page.waitForSelector("#pay-amount");
  const prefill = await page.$eval("#pay-amount", (el) => el.value);
  check("amount is prefilled with the balance", prefill === (due.totalCents / 100).toFixed(2), prefill);
  await fill("#pay-amount", String(due.totalCents / 100 + 50));
  await page.click("button::-p-text(Record $)");
  await page.waitForFunction(() => /more than the/.test(document.body.innerText));
  check("an overpayment is refused", (await db.query(`select 1 from "Payment" where "quoteId"=$1`, [due.id])).rowCount === 0);
  await page.click("label:has(input[name=payMethod][value=check])");
  await fill("#pay-amount", "100");
  await page.type("#pay-note", "Check #1042");
  await page.click("button::-p-text(Record $100)");
  await page.waitForFunction(() => /Recorded \$100\.00\./.test(document.body.innerText));
  const p1 = await q1(`select p.status, p.method, p.note, u.email from "Payment" p join "User" u on u.id = p."recordedById" where p."quoteId"=$1`, [due.id]);
  check("a partial check payment is recorded with who and why", p1?.status === "SUCCEEDED" && p1.method === "check" && p1.note === "Check #1042" && p1.email === ADMIN_EMAIL, JSON.stringify(p1));
  check("the quote stays open for the rest", (await q1(`select status from "Quote" where id=$1`, [due.id])).status === "ACCEPTED");
  const portal = await page.browser().newPage();
  await portal.goto(samples["payment-due"], { waitUntil: "networkidle0" });
  check("client sees the check payment and what's left", /Check/.test(await text(portal)) && /Amount due/.test(await text(portal)));
  await portal.close();

  await go(`/admin/quotes/${due.id}`);
  await page.click("button::-p-text(Record cash or check payment)");
  await page.waitForSelector("#pay-amount");
  await page.click("button::-p-text(Record $)");
  await page.waitForFunction(() => /paid in full/.test(document.body.innerText));
  check("the rest in cash pays it in full", (await q1(`select status from "Quote" where id=$1`, [due.id])).status === "PAID");
  if (due.leadId) check("the request is marked completed", (await q1(`select status from "Lead" where id=$1`, [due.leadId])).status === "COMPLETED");
  const receipts = await until(async () => (await q1(`select count(*)::int n from "EmailLog" where "quoteId"=$1 and type='PAYMENT_RECEIPT'`, [due.id])).n === 2);
  check("the client gets a receipt for each payment", receipts);

  // ── 2. Review invites ───────────────────────────────────────────────────
  const invite = await until(() => q1(`select token, "usedAt" from "ReviewInvite" where "quoteId"=$1`, [due.id]));
  check("paying in full creates a private review link", invite?.token?.length === 43 && !invite.usedAt);
  check("the review link is emailed", await until(async () => (await db.query(`select 1 from "EmailLog" where "quoteId"=$1 and type='REVIEW_INVITE'`, [due.id])).rowCount === 1));
  await go(`/admin/quotes/${due.id}`);
  const adminText = await text();
  check("admin sees the review link and the history", adminText.includes("Copy review link") && adminText.includes("Review link sent to client") && adminText.includes("recorded by hand"));
  await shot("admin-paid-offline");

  const res = await fetch(`${BASE}/review/${invite.token}`);
  check("review page is private: no-store, noindex", res.headers.get("cache-control")?.includes("no-store") && res.headers.get("x-robots-tag")?.includes("noindex"));
  const rp = await page.browser().newPage();
  await rp.setViewport({ width: 1280, height: 900 });
  await rp.goto(`${BASE}/review/${invite.token}`, { waitUntil: "networkidle0" });
  check("the link opens a personal review form", (await text(rp)).includes("How did we do"));
  const prefName = await rp.$eval("#review-authorName", (el) => el.value);
  check("name and town are prefilled from the job", prefName.length > 2 && (await rp.$eval("#review-city", (el) => el.value)).length > 2, prefName);
  await rp.click("label:has(#review-rating-5)");
  await rp.type("#review-body", `${MARK} Fixed the ceiling stain and you can't see where the patch is. On time both days.`);
  await shot("review-form", rp);
  await rp.click("button::-p-text(Send review)");
  await rp.waitForFunction(() => /Your review is posted/.test(document.body.innerText), { timeout: 10000 });
  const t1 = await q1(`select t.published, t.source, t."authorEmail", i."usedAt" from "Testimonial" t join "ReviewInvite" i on i."testimonialId" = t.id where i.token=$1`, [invite.token]);
  check("a 5-star review publishes and uses up the link", t1?.published && t1.source === "website" && !!t1.usedAt && !!t1.authorEmail, JSON.stringify(t1));
  const reviewsHtml = await until(async () => ((await (await fetch(`${BASE}/reviews`)).text()).includes(MARK) ? true : null), 15000);
  check("it shows on the Reviews page", reviewsHtml);
  await rp.goto(`${BASE}/review/${invite.token}`, { waitUntil: "networkidle0" });
  check("the used link says thanks instead of a form", (await text(rp)).includes("your review is in") && !(await rp.$("#review-body")));
  const replay = await fetch(`${BASE}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: invite.token, rating: 5, authorName: "Spam M.", city: "Rogers", body: "Posting a second review with the same link." }) });
  check("a used link can't post again", replay.status === 410, `HTTP ${replay.status}`);
  await rp.close();

  // Low rating on another paid job, with the link sent from the admin.
  const paid = await quoteOf("paid");
  await go(`/admin/quotes/${paid.id}`);
  await page.click("button::-p-text(Email review link)");
  await page.waitForFunction(() => /Review link sent|email didn't send/.test(document.body.innerText));
  const inv2 = await q1(`select token from "ReviewInvite" where "quoteId"=$1`, [paid.id]);
  check("admin can send a review link on a paid job", !!inv2);
  const low = await fetch(`${BASE}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: inv2.token, rating: 2, authorName: "Lee K.", city: "Rogers", body: `${MARK} The crew was late and left dust in the hallway.` }) });
  const lowBody = await low.json();
  check("a 2-star review is accepted but kept private", low.ok && lowBody.published === false);
  check("low rating goes to the business inbox, tagged", await until(async () => (await db.query(`select 1 from "EmailLog" where type='LOW_RATING_FEEDBACK' and subject like '[Feedback/Low-Rating]%Lee K.%'`)).rowCount >= 1));

  // No link, no review.
  const anon = await fetch(`${BASE}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: 5, authorName: "Fake F.", city: "Rogers", body: "A review without a link should never post." }) });
  const bogus = await fetch(`${BASE}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: randomBytes(32).toString("base64url"), rating: 5, authorName: "Fake F.", city: "Rogers", body: "A review with a made-up link should never post." }) });
  check("reviews without a real link are refused", anon.status === 404 && bogus.status === 404, `${anon.status} ${bogus.status}`);
  check("an unknown review link is a 404 page", (await fetch(`${BASE}/review/${randomBytes(32).toString("base64url")}`)).status === 404);
  check("the public Reviews page no longer has an open form", !(await (await fetch(`${BASE}/reviews`)).text()).includes("review-body"));

  // A Stripe payment that clears the balance also sends a link.
  const legacy = await quoteOf("legacy-deposit");
  const lp = await page.browser().newPage();
  let checkoutUrl = null;
  lp.on("request", (r) => { if (r.url().startsWith("https://checkout.stripe.com")) checkoutUrl ??= r.url(); });
  await lp.goto(samples["legacy-deposit"], { waitUntil: "networkidle0" });
  await lp.click("button::-p-text(Pay $)");
  for (let i = 0; i < 50 && !checkoutUrl; i++) await sleep(200);
  await lp.close();
  const pending = await q1(`select id, "amountCents", "stripeCheckoutSessionId" from "Payment" where "quoteId"=$1 and status='PENDING'`, [legacy.id]);
  const payload = JSON.stringify({ id: `evt_${randomBytes(8).toString("hex")}`, object: "event", type: "checkout.session.completed", data: { object: { id: pending.stripeCheckoutSessionId, object: "checkout.session", status: "complete", payment_status: "paid", amount_total: pending.amountCents, currency: "usd", payment_intent: `pi_${randomBytes(6).toString("hex")}`, metadata: { paymentId: pending.id, quoteId: legacy.id } } } });
  const wh = await (await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }), "content-type": "application/json" } })).json();
  check("Stripe pays off the balance", wh.result === "fulfilled");
  check("and a review link is sent automatically", await until(async () => (await db.query(`select 1 from "ReviewInvite" where "quoteId"=$1`, [legacy.id])).rowCount === 1));

  // ── 3. Rate limits live in the database, shared by every instance ──────
  const ip = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
  const codes = [];
  for (let i = 0; i < 5; i++) {
    codes.push((await fetch(`${BASE}/api/coi-requests`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: "{}" })).status);
  }
  check("the 4th request in the window is limited", JSON.stringify(codes) === "[400,400,400,429,429]", JSON.stringify(codes));
  const hashed = createHash("sha256").update(`coi:${ip}`).digest("base64url");
  const row = await q1(`select count from "RateLimitHit" where key=$1`, [hashed]);
  check("the count is stored in the database, hashed", row?.count === 5 && !(await db.query(`select 1 from "RateLimitHit" where key like '%203.0.113%'`)).rowCount, JSON.stringify(row));
} catch (error) {
  check("script completed", false, error.stack?.split("\n").slice(0, 3).join(" | "));
  await shot("failure").catch(() => {});
} finally {
  await browser.close();
  // Leave no test reviews on the site.
  await db.query(`delete from "Testimonial" where body like $1`, [`${MARK}%`]);
  await db.query(`delete from "Session" where "userId" in (select id from "User" where email=$1)`, [ADMIN_EMAIL]);
  await db.end();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
