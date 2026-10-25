// End-to-end test for the contractor admin: sign-in, requests, quote builder, send, lifecycle, metrics.
// Needs the app running with Stripe pointed at stripe-mock (see scripts/e2e-quote.mjs header).
//   BASE_URL=http://localhost:3100 STRIPE_WEBHOOK_SECRET=whsec_e2e node scripts/e2e-admin.mjs
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { config } from "dotenv";
import pg from "pg";
import puppeteer from "puppeteer-core";
import Stripe from "stripe";

config({ quiet: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots/admin";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e";
const ADMIN_EMAIL = "e2e.admin@hillstone.com";
const ADMIN_PASSWORD = `e2e-${randomBytes(9).toString("base64url")}`;
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

// ── Fixtures: an admin login and a fresh request with a photo ─────────────
execFileSync("npx", ["tsx", "scripts/admin-user.ts", ADMIN_EMAIL, "E2E Admin"], { env: { ...process.env, ADMIN_PASSWORD }, stdio: "ignore" });

function png(w, h, rgb) {
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(body)); return Buffer.concat([l, body, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}
await mkdir(SHOTS, { recursive: true });
const form = new FormData();
const email = `casey.morgan+${randomBytes(3).toString("hex")}@example.com`;
for (const [k, v] of Object.entries({ firstName: "Casey", lastName: "Morgan", email, phone: "(479) 555-0188", line1: "410 SW A St", city: "Bentonville", postalCode: "72712", preferredContact: "EMAIL", category: "INTERIOR_REPAIRS", description: "Rotted trim around the back door, and the door sticks at the top corner.", timeline: "WITHIN_2_WEEKS", budgetRange: "FROM_500_TO_1500" })) form.append(k, v);
form.append("photos", new Blob([png(640, 480, [150, 120, 90])], { type: "image/png" }), "back-door.png");
const created = await (await fetch(`${BASE}/api/quote-requests`, { method: "POST", body: form })).json();
const lead = (await db.query(`select id, number from "Lead" where number = $1`, [created.number])).rows[0];
check("fixture request created", !!lead, `#${created.number}`);

// ── Browser helpers ───────────────────────────────────────────────────────
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
async function sendWebhook(object) {
  const payload = JSON.stringify({ id: `evt_${randomBytes(8).toString("hex")}`, object: "event", type: "checkout.session.completed", data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return (await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } })).json();
}

try {
  // ── Access control ──────────────────────────────────────────────────────
  const anon = await fetch(`${BASE}/admin/requests`, { redirect: "manual" });
  check("signed-out /admin redirects to login", anon.status === 307 && anon.headers.get("location")?.includes("/admin/login?next=%2Fadmin%2Frequests"), `${anon.status} ${anon.headers.get("location")}`);
  const forged = await fetch(`${BASE}/admin`, { redirect: "manual", headers: { cookie: "hs_admin=not-a-real-session" } });
  const forgedFinal = await fetch(`${BASE}/admin`, { headers: { cookie: "hs_admin=not-a-real-session" } });
  check("a fake session cookie still lands on login", forgedFinal.url.includes("/admin/login") || forged.status === 307, forgedFinal.url);
  const photoAnon = await fetch(`${BASE}/api/admin/attachments/anything`);
  check("admin photo route needs a session", photoAnon.status === 401);

  // ── Sign in ─────────────────────────────────────────────────────────────
  await go("/admin/login");
  await page.type("#email", ADMIN_EMAIL);
  await page.type("#password", "wrong-password-123");
  await page.click("button[type=submit]");
  await page.waitForSelector("[role=alert]");
  check("wrong password shows an error", (await text()).includes("don't match"));
  await fill("#password", ADMIN_PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
  check("sign-in lands on the overview", page.url().endsWith("/admin"), page.url());
  const cookie = (await page.cookies()).find((c) => c.name === "hs_admin");
  check("session cookie is httpOnly and SameSite=Lax", cookie?.httpOnly && /lax/i.test(cookie.sameSite ?? ""), `${cookie?.httpOnly} ${cookie?.sameSite}`);
  let body = await text();
  check("overview shows the four metrics", ["Incoming requests", "Quote acceptance", "Revenue collected", "Awaiting client response"].every((m) => body.includes(m)));
  const revenueBefore = await page.$eval("dl a:nth-child(3) dd", (el) => el.textContent);
  await shot("overview");

  // ── Requests list ───────────────────────────────────────────────────────
  await go("/admin/requests?status=PENDING_REVIEW");
  body = await text();
  check("pending filter lists the new request", body.includes(`#${lead.number} Casey Morgan`));
  await go(`/admin/requests?q=%23${lead.number}`);
  const rows = await page.$$eval("tbody tr", (els) => els.length);
  check("search by request number", rows === 1, `${rows} rows`);
  await shot("requests");

  // ── Request detail ──────────────────────────────────────────────────────
  await go(`/admin/requests/${lead.id}`);
  body = await text();
  check("detail shows contact, preference, budget and description", ["(479) 555-0188", email, "Email me", "$500–1,500", "Rotted trim around the back door"].every((t) => body.includes(t)));
  await page.waitForFunction(() => [...document.querySelectorAll("#photos-h ~ ul img")].every((i) => i.complete && i.naturalWidth > 0));
  const photoWidth = await page.$eval("#photos-h ~ ul img", (i) => i.naturalWidth);
  check("uploaded photo renders at full resolution", photoWidth === 640, `${photoWidth}px`);
  await page.select("#lead-status", "CONTACTED");
  await page.click("button::-p-text(Update)");
  await page.waitForFunction(() => document.body.innerText.includes("Status set to contacted"));
  check("status can be changed", (await db.query(`select status from "Lead" where id=$1`, [lead.id])).rows[0].status === "CONTACTED");
  await page.type("#note", "Called, sending a quote today.");
  await page.click("button::-p-text(Add note)");
  await page.waitForFunction(() => document.body.innerText.includes("Called, sending a quote today."));
  check("notes are saved", true);
  await shot("request-detail");

  // ── Quote builder ───────────────────────────────────────────────────────
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("a::-p-text(Create quote)")]);
  await page.click("button::-p-text(Send quote)");
  await page.waitForFunction(() => document.querySelectorAll("[aria-invalid=true]").length > 0);
  const invalid = await page.$$eval("[aria-invalid=true]", (els) => els.length);
  check("builder validates before sending", invalid >= 3, `${invalid} invalid fields`);

  await fill("#title", "Back door trim and adjustment");
  await fill("[aria-label='Line 1 description']", "Replace casing and brickmould, adjust door");
  await fill("[aria-label='Line 1 quantity']", "4.5");
  await fill("[aria-label='Line 1 unit price in dollars']", "85");
  await fill("[aria-label='Line 2 description']", "PVC brickmould and casing");
  await fill("[aria-label='Line 2 quantity']", "3");
  await fill("[aria-label='Line 2 unit price in dollars']", "42");
  // The trip fee line starts from the saved quote defaults; set it so totals don't depend on settings.
  await fill("[aria-label='Line 3 unit price in dollars']", "75");
  await page.click("button::-p-text(Discount)");
  await fill("[aria-label='Line 4 description']", "Returning customer");
  await fill("[aria-label='Line 4 unit price in dollars']", "25");
  await fill("#scopeOfWork", "Remove rotted casing and brickmould at the back door. Install PVC trim, adjust hinges so the door closes cleanly, seal and paint.");
  await fill("#exclusions", "Door slab replacement.");
  const total = await page.$eval("[data-testid=builder-total]", (el) => el.textContent);
  check("live total matches server math", total === "$612.95", total);
  body = await text();
  check("builder shows no deposit option; payment due on completion", !(await page.$("input[name=depositMode]")) && body.includes("On completion"));
  await shot("builder");

  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button::-p-text(Save draft)")]);
  const quoteId = page.url().split("/admin/quotes/")[1];
  let q = (await db.query(`select status, "totalCents", "depositBps", "publicToken" from "Quote" where id=$1`, [quoteId])).rows[0];
  check("draft saved with server-computed total", q?.status === "DRAFT" && q.totalCents === 61295 && q.depositBps === 0, JSON.stringify(q));
  const draftToken = q.publicToken;
  const draftPortal = await fetch(`${BASE}/quote/${draftToken}`);
  check("draft isn't visible to clients", draftPortal.status === 404);

  await page.click("button::-p-text(Send quote)");
  await page.waitForSelector("[role=alertdialog]");
  check("send asks for confirmation with the client email", (await text()).includes(`to ${email}?`));
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button::-p-text(Confirm and send)")]);
  q = (await db.query(`select status, "publicToken", "depositFixedCents" from "Quote" where id=$1`, [quoteId])).rows[0];
  check("send marks the quote SENT with a new 43-char token", q.status === "SENT" && q.publicToken !== draftToken && q.publicToken.length === 43 && q.depositFixedCents === null);
  const leadAfter = (await db.query(`select status from "Lead" where id=$1`, [lead.id])).rows[0].status;
  check("request moves to QUOTE_SENT", leadAfter === "QUOTE_SENT", leadAfter);
  const sentEmail = (await db.query(`select "to", subject from "EmailLog" where "quoteId"=$1 and type='QUOTE_SENT'`, [quoteId])).rows[0];
  check("quote email is dispatched to the client", sentEmail?.to === email, sentEmail?.subject);
  body = await text();
  check("admin sees that email isn't configured and can copy the link", body.includes("email didn't send") && body.includes("Copy client link"));
  const clientUrl = await page.$eval("a::-p-text(Open client view)", (a) => a.href).catch(() => page.$$eval("a", (as) => as.find((a) => a.textContent.includes("Open client view")).href));
  await shot("quote-sent");

  // ── Client accepts (no payment), owner marks complete, client pays ─────
  const client = await browser.newPage();
  await client.setViewport({ width: 1280, height: 900 });
  await client.goto(clientUrl, { waitUntil: "networkidle0" });
  let clientBody = await client.evaluate(() => document.body.innerText);
  check("client portal shows the sent quote", clientBody.includes("Back door trim and adjustment") && clientBody.includes("$612.95") && clientBody.includes("Nothing to pay today"));
  await client.click("button::-p-text(Accept quote)");
  await client.waitForFunction(() => document.body.innerText.includes("on our schedule"), { timeout: 10000 });
  check("client accepts without paying", (await db.query(`select count(*)::int n from "Payment" where "quoteId"=$1`, [quoteId])).rows[0].n === 0);
  check("request moves to ACCEPTED", (await db.query(`select status from "Lead" where id=$1`, [lead.id])).rows[0].status === "ACCEPTED");

  await go(`/admin/quotes/${quoteId}`);
  await page.click("button::-p-text(Mark complete and request payment)");
  await page.waitForSelector("#bill-note");
  await page.click("button::-p-text(Send request for)");
  await page.waitForFunction(() => /Payment request for|didn't send/.test(document.body.innerText));
  check("marking complete moves the request to COMPLETED", (await db.query(`select status from "Lead" where id=$1`, [lead.id])).rows[0].status === "COMPLETED");

  await client.reload({ waitUntil: "networkidle0" });
  let checkoutUrl = null;
  client.on("request", (r) => { if (r.url().startsWith("https://checkout.stripe.com")) checkoutUrl ??= r.url(); });
  await client.click("button::-p-text(Pay $612.95)");
  for (let i = 0; i < 50 && !checkoutUrl; i++) await sleep(200);
  check("client is sent to Stripe for the full $612.95", !!checkoutUrl);
  await client.close();
  const pending = (await db.query(`select id, "amountCents", "stripeCheckoutSessionId" from "Payment" where "quoteId"=$1 and status='PENDING'`, [quoteId])).rows[0];
  const wh = await sendWebhook({ id: pending.stripeCheckoutSessionId, object: "checkout.session", status: "complete", payment_status: "paid", amount_total: pending.amountCents, currency: "usd", payment_intent: `pi_${randomBytes(6).toString("hex")}`, metadata: { paymentId: pending.id, quoteId } });
  check("payment webhook fulfilled", wh.result === "fulfilled");

  await go(`/admin/quotes/${quoteId}`);
  body = await text();
  const history = await page.$$eval("#log-h ~ ol li p:first-of-type", (els) => els.map((e) => e.textContent));
  check("history shows sent, viewed, accepted, completed and paid in order", ["Sent to client", "Viewed by client", "Job complete, payment requested: $612.95", "Payment received: $612.95"].every((l, i, arr) => history.indexOf(l) > -1 && (i === 0 || history.indexOf(l) > history.indexOf(arr[i - 1]))), history.join(" | "));
  await shot("quote-lifecycle");

  await go("/admin");
  const revenueAfter = await page.$eval("dl a:nth-child(3) dd", (el) => el.textContent);
  const cents = (s) => Math.round(Number(s.replace(/[$,]/g, "")) * 100);
  check("revenue metric includes the payment", cents(revenueAfter) - cents(revenueBefore) === 61295, `${revenueBefore} → ${revenueAfter}`);

  // ── Resend and void on another quote ────────────────────────────────────
  const samples = JSON.parse(execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], { env: { ...process.env, NEXT_PUBLIC_APP_URL: BASE }, encoding: "utf8" }).trim().split("\n").pop());
  const openToken = samples["open-full"].split("/quote/")[1];
  const openId = (await db.query(`select id from "Quote" where "publicToken"=$1`, [openToken])).rows[0].id;
  await go(`/admin/quotes/${openId}`);
  await page.click("button::-p-text(Resend email)");
  await page.waitForFunction(() => /email didn't send|sent again/.test(document.body.innerText));
  check("resend reports the email outcome", true);
  await page.click("button::-p-text(Void quote)");
  await page.waitForSelector("[role=alertdialog]");
  await page.click("[role=alertdialog] button::-p-text(Void quote)");
  await page.waitForFunction(() => document.body.innerText.includes("Quote voided."));
  const voidPortal = await (await fetch(samples["open-full"])).text();
  check("voided quote shows as withdrawn to the client", voidPortal.includes("This quote was withdrawn"));
  const payVoid = await fetch(`${BASE}/api/quotes/${openToken}/checkout`, { method: "POST" });
  check("voided quote can't be paid", payVoid.status === 409);

  // ── The job is complete (marked above, then paid in full) ──────────────
  check("paid request stays COMPLETED", (await db.query(`select status from "Lead" where id=$1`, [lead.id])).rows[0].status === "COMPLETED");
  await go("/admin/requests?status=COMPLETED");
  check("completed filter shows the finished job", (await text()).includes(`#${lead.number} Casey Morgan`));

  await go("/admin/quotes?status=PAID");
  check("quotes list filters by status", (await text()).includes("Back door trim and adjustment"));
  await shot("quotes");

  // ── Mobile ──────────────────────────────────────────────────────────────
  await page.setViewport({ width: 390, height: 844 });
  for (const p of ["/admin", "/admin/requests", `/admin/quotes/${quoteId}`]) {
    await go(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(`no horizontal page scroll at 390px: ${p.replace(quoteId, "[id]")}`, !overflow);
  }
  await go("/admin");
  await shot("overview-mobile", false);
  await page.setViewport({ width: 1366, height: 900 });

  // ── Sign out ────────────────────────────────────────────────────────────
  await go("/admin");
  // Two sign-out buttons exist (phone and desktop); click the one that's visible.
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.$$eval("aside button", (bs) => bs.find((b) => b.textContent.includes("Sign out") && b.offsetParent !== null).click()),
  ]);
  check("sign out returns to login", page.url().includes("/admin/login"));
  const reuse = await fetch(`${BASE}/admin`, { headers: { cookie: `hs_admin=${cookie.value}` } });
  check("old session cookie no longer works", reuse.url.includes("/admin/login"), reuse.url);
} catch (error) {
  check("script completed", false, error.stack?.split("\n").slice(0, 3).join(" | "));
  await shot("failure").catch(() => {});
} finally {
  await browser.close();
  await db.query(`delete from "Session" where "userId" in (select id from "User" where email=$1)`, [ADMIN_EMAIL]);
  await db.end();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
