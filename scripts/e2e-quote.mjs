// End-to-end test for the quote portal and payment flow.
// Needs: the app running with Stripe pointed at stripe-mock, plus Postgres.
//   docker compose --profile test up -d
//   STRIPE_SECRET_KEY=sk_test_mock STRIPE_WEBHOOK_SECRET=whsec_e2e STRIPE_API_HOST=localhost \
//     STRIPE_API_PORT=12111 STRIPE_API_PROTOCOL=http NEXT_PUBLIC_SITE_URL=http://localhost:3100 npx next start -p 3100
//   BASE_URL=http://localhost:3100 STRIPE_WEBHOOK_SECRET=whsec_e2e node scripts/e2e-quote.mjs
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";
import puppeteer from "puppeteer-core";
import Stripe from "stripe";

config({ quiet: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots/quote";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_e2e";
const stripe = new Stripe("sk_test_signing_only");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const quotes = JSON.parse(
  execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], {
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: BASE },
    encoding: "utf8",
  }).trim().split("\n").pop(),
);
const tokenOf = (url) => url.split("/quote/")[1];

async function quoteRow(token) {
  const { rows } = await db.query(`select id, status, "declineReason", "declineNote" from "Quote" where "publicToken" = $1`, [token]);
  return rows[0];
}
async function payments(quoteId) {
  const { rows } = await db.query(`select id, status, "amountCents", "isDeposit", "stripeCheckoutSessionId" from "Payment" where "quoteId" = $1 order by "createdAt"`, [quoteId]);
  return rows;
}
async function sendWebhook(type, object, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify({ id: `evt_${randomBytes(8).toString("hex")}`, object: "event", type, data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
/** Simulates Stripe telling us the customer paid the given pending payment. */
async function completeCheckout(quoteId) {
  const pending = (await payments(quoteId)).filter((p) => p.status === "PENDING").at(-1);
  const session = {
    id: pending.stripeCheckoutSessionId,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    amount_total: pending.amountCents,
    currency: "usd",
    payment_intent: `pi_${randomBytes(6).toString("hex")}`,
    metadata: { paymentId: pending.id, quoteId },
  };
  return { session, result: await sendWebhook("checkout.session.completed", session) };
}

await mkdir(SHOTS, { recursive: true });
const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
async function open(url, width = 1280, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: "networkidle0" });
  return page;
}
const shot = (page, name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
const text = (page) => page.evaluate(() => document.body.innerText);

/** Clicks a pay button and returns the Checkout URL the browser was sent to. */
async function clickPay(page, label) {
  let checkoutUrl = null;
  page.on("request", (r) => {
    if (r.url().startsWith("https://checkout.stripe.com")) checkoutUrl ??= r.url();
  });
  await page.click(`button::-p-text(${label})`);
  for (let i = 0; i < 50 && !checkoutUrl; i++) await new Promise((r) => setTimeout(r, 200));
  return checkoutUrl;
}

try {
  // ── Open quote: document renders ────────────────────────────
  let page = await open(quotes["open-deposit"]);
  let body = await text(page);
  check("open quote shows title, badge and customer", body.includes("Front door trim replacement") && body.includes("Awaiting your approval") && body.includes("Prepared for"));
  const rows = await page.$$eval("table tbody tr td:last-child", (els) => els.length);
  check("itemized breakdown lists all 5 line items", rows === 5, `${rows} rows`);
  check("groups labor, materials and trip fee", ["Labor", "Materials", "Trip fee"].every((g) => body.includes(g)));
  check("shows valid-until date and deposit", body.includes("Valid until") && body.includes("Deposit to start (50%)"));
  const photoCount = await page.$$eval("#photos-heading ~ ul img", (els) => els.length);
  const photoStatus = photoCount ? (await fetch(await page.$eval("#photos-heading ~ ul img", (el) => el.src))).status : 0;
  check("request photos load through the token-scoped route", photoCount > 0 && photoStatus === 200, `${photoCount} photos, HTTP ${photoStatus}`);
  await shot(page, "open-deposit");

  // ── Pay deposit via Checkout, then webhook ─────────────────
  const openToken = tokenOf(quotes["open-deposit"]);
  const openQuote = await quoteRow(openToken);
  check("first view marks quote VIEWED", openQuote.status === "VIEWED", openQuote.status);
  let checkoutUrl = await clickPay(page, "Accept and pay $497");
  check("accept sends the browser to Stripe Checkout", !!checkoutUrl, checkoutUrl?.slice(0, 40));
  let pays = await payments(openQuote.id);
  check("a pending deposit payment is recorded", pays.length === 1 && pays[0].status === "PENDING" && pays[0].isDeposit);
  await page.close();

  let { session, result } = await completeCheckout(openQuote.id);
  check("webhook fulfills the deposit", result.status === 200 && result.body.result === "fulfilled", JSON.stringify(result.body));
  const replay = await sendWebhook("checkout.session.completed", session);
  check("replayed webhook is idempotent", replay.status === 200 && replay.body.result === "already", replay.body.result);
  check("quote is ACCEPTED after the deposit", (await quoteRow(openToken)).status === "ACCEPTED");

  page = await open(`${quotes["open-deposit"]}?session_id=${session.id}`);
  body = await text(page);
  check("return from Checkout shows payment received", body.includes("Payment received"));
  check("deposit-paid state shows the balance", body.includes("Deposit received") && body.includes("Balance due"));
  await shot(page, "deposit-paid");

  // Tampering: asking for "full" after a deposit must fail; only the balance is payable.
  const tamper = await fetch(`${BASE}/api/quotes/${openToken}/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ option: "full" }) });
  check("server refuses to charge the full amount twice", tamper.status === 409, `HTTP ${tamper.status}`);

  checkoutUrl = await clickPay(page, "Pay remaining");
  check("balance payment opens Checkout", !!checkoutUrl);
  await page.close();
  ({ result } = await completeCheckout(openQuote.id));
  check("webhook fulfills the balance", result.body.result === "fulfilled");
  check("quote is PAID once the balance is in", (await quoteRow(openToken)).status === "PAID");
  page = await open(quotes["open-deposit"]);
  body = await text(page);
  check("paid state lists both payments", body.includes("Paid in full") && (body.match(/Visa ending|Card/g) ?? []).length >= 2);
  await shot(page, "paid-after-flow");
  await page.close();

  const emails = (await db.query(`select type from "EmailLog" where "quoteId" = $1`, [openQuote.id])).rows.map((r) => r.type);
  check("receipts and accepted notices were sent for each payment", emails.filter((t) => t === "PAYMENT_RECEIPT").length === 2 && emails.includes("QUOTE_ACCEPTED_NOTICE"), emails.join(","));

  // ── Decline ─────────────────────────────────────────────────
  page = await open(quotes["open-full"]);
  body = await text(page);
  check("no-deposit quote offers a single full payment", body.includes("Amount due") && !body.includes("Deposit ("));
  await page.click("button::-p-text(Decline this quote)");
  await page.waitForFunction(() => document.querySelector("dialog[open]"));
  await new Promise((r) => setTimeout(r, 250));
  await page.click("button::-p-text(Decline quote)");
  await page.waitForSelector("#declineReason-error");
  check("decline requires a reason", true);
  await shot(page, "decline-dialog", false);
  await page.click("label:has(input[name=declineReason][value=POSTPONED])");
  await page.type("dialog textarea", "Pushing this to spring.");
  await page.click("button::-p-text(Decline quote)");
  await page.waitForFunction(() => document.body.innerText.includes("You declined this quote"), { timeout: 10000 });
  const declined = await quoteRow(tokenOf(quotes["open-full"]));
  check("decline saves status, reason and note", declined.status === "DECLINED" && declined.declineReason === "POSTPONED" && declined.declineNote === "Pushing this to spring.");
  await new Promise((r) => setTimeout(r, 300));
  const declineEmail = (await db.query(`select 1 from "EmailLog" where "quoteId" = $1 and type = 'QUOTE_DECLINED_NOTICE'`, [declined.id])).rowCount;
  check("contractor is notified of the decline", declineEmail === 1);
  await shot(page, "declined");
  await page.close();
  const payDeclined = await fetch(`${BASE}/api/quotes/${tokenOf(quotes["open-full"])}/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ option: "full" }) });
  check("a declined quote can't be paid", payDeclined.status === 409);

  // ── Other states ───────────────────────────────────────────
  for (const [key, expected] of [
    ["expired", "This quote has expired"],
    ["deposit-paid", "Deposit received"],
    ["paid", "Paid in full"],
    ["void", "This quote was withdrawn"],
    ["declined", "You declined this quote"],
  ]) {
    page = await open(quotes[key]);
    body = await text(page);
    check(`${key} quote shows its state`, body.includes(expected));
    if (key === "expired") await shot(page, "expired");
    await page.close();
  }
  const payExpired = await fetch(`${BASE}/api/quotes/${tokenOf(quotes.expired)}/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ option: "full" }) });
  check("an expired quote can't be paid", payExpired.status === 409);

  // ── Invalid links and security ─────────────────────────────
  const unknown = await fetch(`${BASE}/quote/${randomBytes(32).toString("base64url")}`);
  const malformed = await fetch(`${BASE}/quote/not-a-real-token`);
  check("unknown and malformed tokens return 404", unknown.status === 404 && malformed.status === 404);
  page = await open(`${BASE}/quote/not-a-real-token`);
  check("invalid link page explains what to do", (await text(page)).includes("We can't find that quote"));
  await shot(page, "not-found");
  await page.close();

  const h = (await fetch(quotes.paid)).headers;
  check("quote pages are private: no-store, noindex, no-referrer", h.get("cache-control")?.includes("no-store") && h.get("x-robots-tag")?.includes("noindex") && h.get("referrer-policy") === "no-referrer", `${h.get("cache-control")} | ${h.get("x-robots-tag")} | ${h.get("referrer-policy")}`);
  const forged = await sendWebhook("checkout.session.completed", { id: "cs_forged", object: "checkout.session" }, "whsec_attacker");
  check("forged webhook is rejected", forged.status === 400);
  const photoOtherToken = await fetch(`${BASE}/api/quotes/${randomBytes(32).toString("base64url")}/photos/anything`);
  check("photos aren't reachable without the right token", photoOtherToken.status === 404);

  // ── Mobile ─────────────────────────────────────────────────
  const fresh = JSON.parse(execFileSync("npx", ["tsx", "scripts/sample-quotes.ts", "--json"], { env: { ...process.env, NEXT_PUBLIC_SITE_URL: BASE }, encoding: "utf8" }).trim().split("\n").pop());
  page = await open(fresh["open-deposit"], 390, 844);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("portal has no horizontal scroll at 390px", !overflow);
  const bar = await page.$eval("a[href='#pay']", (el) => getComputedStyle(el.closest("div.fixed")).position).catch(() => null);
  check("phones get a fixed pay bar", bar === "fixed");
  await shot(page, "mobile-open", false);
  await shot(page, "mobile-open-full");
  await page.close();
} catch (error) {
  check("script completed", false, error.stack?.split("\n").slice(0, 3).join(" | "));
} finally {
  await browser.close();
  await db.end();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
