// End-to-end test for team accounts, role permissions and site settings.
// Needs the app running (any mode).  BASE_URL=http://localhost:3100 node scripts/e2e-team.mjs
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import pg from "pg";
import puppeteer from "puppeteer-core";

config({ quiet: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots/team";
const OWNER_EMAIL = "e2e.team.owner@hillstone.com";
const OWNER_PASSWORD = `e2e-${randomBytes(9).toString("base64url")}`;
const tag = randomBytes(2).toString("hex");
const TECH_EMAIL = `e2e.tech.${tag}@hillstone.com`;
const TECH_NEW_PASSWORD = `my own sturdy phrase ${tag}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// Every suite signs in and submits forms from the same local address, and rate limits now persist in the
// database, so start each run with fresh counters (local test database only).
await db.query(`delete from "RateLimitHit"`);
const savedSettings = (await db.query(`select data, "updatedById" from "SiteSettings" where id='site'`)).rows[0] ?? null;

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let originalSettings = null;

execFileSync("npx", ["tsx", "scripts/admin-user.ts", OWNER_EMAIL, "Owen Owner"], { env: { ...process.env, ADMIN_PASSWORD: OWNER_PASSWORD }, stdio: "ignore" });
await mkdir(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
// Separate cookie jars: the owner and the new team member are signed in at the same time.
const ownerCtx = await browser.createBrowserContext();
const techCtx = await browser.createBrowserContext();
const owner = await ownerCtx.newPage();
const tech = await techCtx.newPage();
for (const p of [owner, tech]) await p.setViewport({ width: 1366, height: 900 });

// Two sessions run as tabs in one headless Firefox, which pauses animation frames in the
// background tab and can stall clicks there. Bring a tab forward before using it.
const go = async (page, p) => {
  await page.bringToFront();
  return page.goto(BASE + p, { waitUntil: "networkidle0" });
};
const text = (page) => page.evaluate(() => document.body.innerText);
const shot = (page, name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
async function fill(page, selector, value) {
  await page.bringToFront();
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" }));
  await page.click(selector, { count: 3 });
  await page.keyboard.press("Backspace");
  if (value) await page.type(selector, value);
}
async function signIn(page, email, password) {
  await go(page, "/admin/login");
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.click("button[type=submit]")]);
  await sleep(300);
}
const navLabels = (page) => page.$$eval("nav[aria-label=Admin] a", (as) => as.map((a) => a.textContent.trim()));

try {
  // ── Owner creates a technician ───────────────────────────────────────────
  await signIn(owner, OWNER_EMAIL, OWNER_PASSWORD);
  const ownerNav = await navLabels(owner);
  check("owners see Team and Site settings", ownerNav.some((l) => l.startsWith("Team")) && ownerNav.some((l) => l.startsWith("Site settings")), ownerNav.join(", "));
  await go(owner, "/admin/team");
  check("team page lists accounts and explains roles", (await text(owner)).includes("Owen Owner (you)") && (await text(owner)).includes("What each role can do"));

  await go(owner, "/admin/team/new");
  const suggested = await owner.$eval("#tempPassword", (el) => el.value);
  check("a readable temporary password is suggested", /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/.test(suggested), suggested);
  await owner.click("button::-p-text(Create account)");
  await owner.waitForFunction(() => document.querySelectorAll("[aria-invalid=true]").length >= 2);
  check("new account form validates", true);
  await owner.type("#name", "Terry Tech");
  await owner.type("#email", TECH_EMAIL);
  await owner.click("input[name=role][value=TECHNICIAN]");
  await owner.click("button::-p-text(Create account)");
  await owner.waitForSelector("[data-testid=temp-password]");
  const tempPassword = await owner.$eval("[data-testid=temp-password]", (el) => el.textContent.trim());
  check("account is created and the temporary password shown once", tempPassword === suggested, tempPassword);
  await shot(owner, "team-created", false);
  const techRow = (await db.query(`select id, role, "mustChangePassword", "passwordHash" from "User" where email=$1`, [TECH_EMAIL])).rows[0];
  check("stored as a technician who must set a password, hash only", techRow?.role === "TECHNICIAN" && techRow.mustChangePassword && techRow.passwordHash.startsWith("scrypt$") && !techRow.passwordHash.includes(tempPassword));
  const notice = (await db.query(`select subject from "EmailLog" where type='STAFF_ACCOUNT_NOTICE' and "to"=$1`, [TECH_EMAIL])).rows[0];
  check("account-ready notice is sent", !!notice, notice?.subject);

  await go(owner, "/admin/team/new");
  await owner.type("#name", "Duplicate");
  await owner.type("#email", TECH_EMAIL);
  await owner.click("button::-p-text(Create account)");
  await owner.waitForFunction(() => document.body.innerText.includes("already uses this email"));
  check("duplicate emails are rejected", true);

  // ── Technician's first sign-in ───────────────────────────────────────────
  await signIn(tech, TECH_EMAIL, tempPassword);
  check("temporary password forces a new password first", tech.url().endsWith("/admin/password") && (await text(tech)).includes("Choose your password"), tech.url());
  await go(tech, "/admin/requests");
  check("other admin pages wait until the password is set", tech.url().endsWith("/admin/password"));
  await tech.type("#current", "not-the-temp-password");
  await tech.type("#next", TECH_NEW_PASSWORD);
  await tech.type("#confirm", TECH_NEW_PASSWORD);
  await tech.click("button[type=submit]");
  await tech.waitForFunction(() => document.body.innerText.includes("That isn't your current password"));
  check("wrong temporary password is refused", true);
  await fill(tech, "#current", tempPassword);
  await Promise.all([tech.waitForNavigation({ waitUntil: "networkidle0" }), tech.click("button[type=submit]")]);
  check("setting a password lands on the overview", tech.url().includes("/admin?welcome=1") && (await text(tech)).includes("Password set"));

  // ── Technician permissions ───────────────────────────────────────────────
  const techNav = await navLabels(tech);
  check("technicians don't see Portfolio, Reviews, Team or Settings", !techNav.some((l) => /Portfolio|Reviews|Team|Site settings/.test(l)), techNav.join(", "));
  check("technicians don't see revenue", !(await text(tech)).includes("Revenue collected"));
  await shot(tech, "tech-overview", false);
  for (const p of ["/admin/team", "/admin/settings/site", "/admin/portfolio", "/admin/reviews/new"]) {
    await go(tech, p);
    check(`technician is turned away from ${p}`, tech.url().includes("/admin?denied=1"));
  }
  const leadId = (await db.query(`select id from "Lead" order by "createdAt" desc limit 1`)).rows[0]?.id;
  if (leadId) {
    await go(tech, `/admin/requests/${leadId}`);
    check("technicians can open requests but not create quotes", (await text(tech)).includes("What they need") && !(await text(tech)).includes("Create quote"));
    await go(tech, `/admin/requests/${leadId}/quote/new`);
    check("the quote builder URL is refused too", tech.url().includes("/admin?denied=1"));
  }
  const techCookie = (await tech.cookies()).find((c) => c.name === "hs_admin").value;
  const upload = await fetch(`${BASE}/api/admin/projects/anything/images`, { method: "POST", headers: { cookie: `hs_admin=${techCookie}` }, body: new FormData() });
  check("upload API refuses a technician", upload.status === 403, String(upload.status));

  // ── Owner edits role: technician becomes staff ───────────────────────────
  await go(owner, `/admin/team/${techRow.id}`);
  await owner.click("input[name=role][value=STAFF]");
  await owner.click("button::-p-text(Save changes)");
  await owner.waitForFunction(() => document.body.innerText.includes("Saved."));
  await go(tech, "/admin");
  check("role change applies on the next page load", (await navLabels(tech)).some((l) => l.startsWith("Portfolio")));

  await go(owner, `/admin/team/${(await db.query(`select id from "User" where email=$1`, [OWNER_EMAIL])).rows[0].id}`);
  const selfRoleDisabled = await owner.$eval("input[name=role][value=OWNER]", (el) => el.disabled);
  const ownerPage = await text(owner);
  check("owners can't change their own role or revoke themselves", selfRoleDisabled && !ownerPage.includes("Revoke access"));

  // ── Password reset signs them out ────────────────────────────────────────
  await go(owner, `/admin/team/${techRow.id}`);
  await owner.click("button::-p-text(Reset password)");
  await owner.waitForSelector("#reset-h");
  await owner.click("[role=alertdialog] button::-p-text(Reset password)");
  await owner.waitForSelector("[data-testid=temp-password]");
  const resetPassword = await owner.$eval("[data-testid=temp-password]", (el) => el.textContent.trim());
  await go(tech, "/admin");
  check("reset signs the person out everywhere", tech.url().includes("/admin/login"));
  await signIn(tech, TECH_EMAIL, TECH_NEW_PASSWORD);
  check("their old password stops working", (await text(tech)).includes("don't match"));
  await signIn(tech, TECH_EMAIL, resetPassword);
  check("the new temporary password works and forces a change", tech.url().endsWith("/admin/password"));
  await tech.type("#current", resetPassword);
  await tech.type("#next", `${TECH_NEW_PASSWORD} again`);
  await tech.type("#confirm", `${TECH_NEW_PASSWORD} again`);
  await Promise.all([tech.waitForNavigation({ waitUntil: "networkidle0" }), tech.click("button[type=submit]")]);

  // ── Revoke and restore access ────────────────────────────────────────────
  await go(owner, `/admin/team/${techRow.id}`);
  await owner.click("button::-p-text(Revoke access)");
  await owner.waitForSelector("#revoke-h");
  await owner.click("[role=alertdialog] button::-p-text(Revoke access)");
  await owner.waitForFunction(() => document.body.innerText.includes("Access revoked."));
  await go(tech, "/admin");
  check("revoking access signs them out", tech.url().includes("/admin/login"));
  await signIn(tech, TECH_EMAIL, `${TECH_NEW_PASSWORD} again`);
  check("revoked accounts can't sign in (same message as a bad password)", (await text(tech)).includes("don't match"));
  await go(owner, "/admin/team");
  check("team list shows revoked access", (await text(owner)).includes("Access revoked"));
  await shot(owner, "team-list");
  await go(owner, `/admin/team/${techRow.id}`);
  await owner.click("button::-p-text(Restore access)");
  await owner.waitForFunction(() => document.body.innerText.includes("Access restored"));
  await signIn(tech, TECH_EMAIL, `${TECH_NEW_PASSWORD} again`);
  check("restored accounts can sign in again", tech.url().endsWith("/admin"));

  // ── Site settings ────────────────────────────────────────────────────────
  await go(tech, "/admin/settings/site");
  check("staff can't open site settings", tech.url().includes("/admin?denied=1"));
  await go(owner, "/admin/settings/site");
  // Remember the current values so they can be put back through the UI (which refreshes cached pages).
  const edited = ["phone", "hours", "licenseNumber", "insurance-0", "googleReviewsUrl", "replyBusinessDays", "tripFee"];
  originalSettings = Object.fromEntries(await Promise.all(edited.map(async (id) => [id, await owner.$eval(`#${id}`, (el) => el.value)])));
  await fill(owner, "#phone", "12345");
  await owner.click("button::-p-text(Save settings)");
  await owner.waitForFunction(() => document.body.innerText.includes("Fix the highlighted fields"));
  check("settings validate before saving", (await text(owner)).includes("10-digit phone"));
  await fill(owner, "#phone", "(479) 200-4455");
  await fill(owner, "#hours", "Mon–Sat 7am–5pm");
  await fill(owner, "#licenseNumber", "0123456");
  await fill(owner, "#insurance-0", "$2,000,000 per occurrence");
  await fill(owner, "#googleReviewsUrl", "https://g.page/r/example-hill-stone/review");
  await fill(owner, "#replyBusinessDays", "2");
  await fill(owner, "#tripFee", "89");
  await owner.click("button::-p-text(Save settings)");
  await owner.waitForFunction(() => document.body.innerText.includes("The site shows the new details now"));
  await shot(owner, "site-settings");

  const strip = (h) => h.replaceAll("<!-- -->", "");
  const home = strip(await (await fetch(`${BASE}/`)).text());
  check("new phone and hours show site-wide right away", home.includes("(479) 200-4455") && home.includes("tel:+14792004455") && home.includes("Mon–Sat 7am–5pm") && !home.includes("555-0142"));
  check(
    "the license line appears once a number is entered; insurance waits for its claim",
    home.includes("Arkansas license 0123456") && !home.includes("Insured") && !home.includes("Licensed and insured"),
  );
  await owner.click("#claim-insured");
  await owner.click("button::-p-text(Save settings)");
  await owner.waitForFunction(() => document.body.innerText.includes("The site shows the new details now"));
  const shown = strip(await (await fetch(`${BASE}/`)).text());
  check("insurance appears in the footer once the claim is on", shown.includes("Insured. Arkansas license 0123456.") && shown.includes("Insured: $2,000,000 per occurrence general liability"));
  await owner.click("#claim-insured");
  await owner.click("button::-p-text(Save settings)");
  await owner.waitForFunction(() => document.body.innerText.includes("The site shows the new details now"));
  const ld = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? "{}");
  check("a real phone number goes into structured data", ld.telephone === "+14792004455" && ld.sameAs?.[0]?.includes("g.page"));
  check("Google review buttons appear once the link is set", strip(await (await fetch(`${BASE}/reviews`)).text()).includes("Read our reviews on Google"));
  const faq = strip(await (await fetch(`${BASE}/faq`)).text());
  check("policies update the FAQ", faq.includes("within two business days"));
  const about = strip(await (await fetch(`${BASE}/about`)).text());
  check("About names both founders", about.includes("Aidan Sanders") && about.includes("Tucker Davidson"));
  if (leadId) {
    await go(owner, `/admin/requests/${leadId}/quote/new`);
    const trip = await owner.$eval("[aria-label='Line 3 unit price in dollars']", (el) => el.value);
    check("new quotes start with the saved trip fee", trip === "89", trip);
  }
  // The quote form is a client component: it gets settings through the provider.
  await go(tech, "/request-a-quote");
  await tech.click("button[type=submit]");
  await tech.waitForSelector("#firstName-error");
  check("client components get the new settings too", (await text(tech)).includes("Rather talk? (479) 200-4455"));
} catch (error) {
  check("script completed", false, error.stack?.split("\n").slice(0, 3).join(" | "));
  await shot(owner, "failure-owner").catch(() => {});
  await shot(tech, "failure-tech").catch(() => {});
} finally {
  // Restore settings through the page so public pages are refreshed, not just the database.
  if (originalSettings) {
    try {
      await go(owner, "/admin/settings/site");
      for (const [id, value] of Object.entries(originalSettings)) await fill(owner, `#${id}`, value);
      await owner.click("button::-p-text(Save settings)");
      await owner.waitForFunction(() => document.body.innerText.includes("The site shows the new details now"), { timeout: 15000 });
    } catch (e) {
      console.log("WARN  couldn't restore settings through the UI:", e.message.split("\n")[0]);
    }
  }
  await browser.close();
  // Put settings back the way they were and remove test accounts.
  if (savedSettings) await db.query(`update "SiteSettings" set data=$1, "updatedById"=$2 where id='site'`, [savedSettings.data, savedSettings.updatedById]);
  else await db.query(`delete from "SiteSettings" where id='site'`);
  await db.query(`delete from "User" where email = any($1)`, [[TECH_EMAIL, OWNER_EMAIL]]);
  await db.end();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
