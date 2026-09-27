// Headless browser smoke test against a running server.
// Usage: BASE_URL=http://localhost:3100 SHOTS=/tmp/shots node scripts/e2e-smoke.mjs
// The gallery checks use the seed's sample projects, so start the server with SHOW_SAMPLE_CONTENT=1
// (they're hidden from the public site otherwise).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "./.e2e-shots";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

// A tiny valid PNG, generated so the test has no fixture files.
function png(w, h, rgb) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())]);
  const raw = Buffer.concat(Array(h).fill(row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(SHOTS, { recursive: true });
const fixtures = path.join(SHOTS, "fixtures");
await mkdir(fixtures, { recursive: true });
const photoA = path.join(fixtures, "hallway-wall.png");
const photoB = path.join(fixtures, "ceiling-stain.png");
const notImage = path.join(fixtures, "notes.txt");
await writeFile(photoA, png(320, 240, [180, 150, 110]));
await writeFile(photoB, png(320, 240, [90, 110, 140]));
await writeFile(notImage, "not a photo");

const browser = await puppeteer.launch({
  browser: "firefox",
  executablePath: process.env.FIREFOX ?? "/usr/bin/firefox",
  headless: true,
});

async function open(url, width = 1280, height = 900) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(BASE + url, { waitUntil: "networkidle0" });
  return page;
}
const shot = (page, name, fullPage = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });

try {
  // ── Quote form ─────────────────────────────────────────────
  let page = await open("/request-a-quote");
  await page.click("button[type=submit]");
  await page.waitForSelector("#firstName-error");
  const errorCount = await page.$$eval("[role=alert]", (els) => els.length);
  const focused = await page.evaluate(() => document.activeElement?.id);
  check("empty submit shows field errors", errorCount >= 8, `${errorCount} errors`);
  check("focus moves to first invalid field", focused === "firstName", `focused #${focused}`);
  await shot(page, "quote-errors");

  await page.type("#firstName", "Jordan");
  await page.type("#lastName", "Ellis");
  await page.type("#email", "jordan.ellis@example.com");
  await page.type("#phone", "4795550177");
  const phone = await page.$eval("#phone", (el) => el.value);
  check("phone formats as typed", phone === "(479) 555-0177", phone);
  await page.click("label:has(input[name=preferredContact][value=TEXT])");
  await page.type("#line1", "212 W Central Ave");
  await page.type("#city", "Bentonville");
  await page.type("#postalCode", "72712");
  await page.click("label:has(input[name=category][value=CARPENTRY_DOORS_TRIM])");
  await page.type("#description", "Back door sticks at the top and the trim at the bottom is soft. Probably needs new casing.");
  await page.select("#timeline", "WITHIN_A_MONTH");
  await page.click("label:has(input[name=budgetRange][value=FROM_500_TO_1500])");
  const firstNameErrorGone = (await page.$("#firstName-error")) === null;
  check("errors clear as fields are fixed", firstNameErrorGone);

  const input = await page.$("#photos");
  await input.uploadFile(photoA, photoB, notImage);
  await page.waitForSelector("ul[aria-label='Attached photos'] li");
  let thumbs = await page.$$eval("ul[aria-label='Attached photos'] li", (els) => els.length);
  const rejectedText = await page.evaluate(() => document.body.innerText.includes("notes.txt: only JPG, PNG and WebP"));
  check("two photos previewed", thumbs === 2, `${thumbs} thumbnails`);
  check("non-image rejected with reason", rejectedText);
  await shot(page, "quote-filled");

  await page.click("button::-p-text(Remove ceiling-stain.png)");
  thumbs = await page.$$eval("ul[aria-label='Attached photos'] li", (els) => els.length);
  check("remove button removes a photo", thumbs === 1, `${thumbs} left`);

  await page.click("button[type=submit]");
  await page.waitForSelector(".quote-done h2", { timeout: 15000 });
  const heading = await page.$eval(".quote-done h2", (el) => el.textContent);
  check("submission shows confirmation", /Request #\d+ is in\./.test(heading), heading);
  const replyText = await page.$eval(".quote-done", (el) => el.innerText);
  check("confirmation shows reply day and email", /by \w+day, \w+ \d+/.test(replyText) && replyText.includes("jordan.ellis@example.com"));
  await shot(page, "quote-success");
  await page.close();

  // Mobile layout of the form
  page = await open("/request-a-quote", 390, 844);
  await shot(page, "quote-mobile");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("quote form has no horizontal scroll at 390px", !overflow);
  await page.close();

  // ── Mobile nav drawer (Phase 2) ────────────────────────────
  page = await open("/", 390, 844);
  await page.click("button[aria-haspopup=dialog]");
  await page.waitForFunction(() => document.querySelector("dialog.mobile-drawer")?.open);
  await new Promise((r) => setTimeout(r, 350));
  await shot(page, "mobile-drawer", false);
  await page.keyboard.press("Escape");
  const drawerClosed = await page.evaluate(() => !document.querySelector("dialog.mobile-drawer")?.open);
  check("mobile drawer opens and closes with Esc", drawerClosed);
  await page.close();

  // ── Our work ───────────────────────────────────────────────
  page = await open("/our-work");
  const all = await page.$$eval("main ul.grid > li", (els) => els.length);
  await page.click("button[aria-pressed]::-p-text(Exterior)");
  const exterior = await page.$$eval("main ul.grid > li", (els) => els.length);
  const url = page.url();
  check("category filter narrows projects", all > exterior && exterior >= 1, `${all} → ${exterior}`);
  check("filter is reflected in the URL", url.includes("category=exterior-repairs"));
  await page.click("main ul.grid > li button");
  await page.waitForFunction(() => document.querySelector("dialog.project-dialog")?.open);
  await new Promise((r) => setTimeout(r, 300));
  const dialogText = await page.$eval("dialog.project-dialog", (el) => el.innerText);
  check("project detail shows scope, materials and location", ["What we did", "Materials", "Location"].every((t) => dialogText.includes(t)));
  await shot(page, "work-dialog", false);
  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => !document.querySelector("dialog.project-dialog")?.open);
  check("project dialog closes with Esc", closed);
  await page.click("button[aria-pressed]::-p-text(All work)");
  await shot(page, "work");
  await page.close();

  page = await open("/our-work?project=sample-deck-board-railing");
  await page.waitForFunction(() => document.querySelector("dialog.project-dialog")?.open, { timeout: 5000 }).catch(() => {});
  const deepLinked = await page.evaluate(() => document.querySelector("#project-title")?.textContent);
  check("project deep link opens its detail", deepLinked === "Deck board and railing repair", deepLinked ?? "none");
  await page.close();

  // ── FAQ ────────────────────────────────────────────────────
  page = await open("/faq");
  await page.click("details summary");
  const openCount = await page.$$eval("details[open]", (els) => els.length);
  check("FAQ question expands on click", openCount === 1);
  const ldTypes = await page.$$eval("script[type='application/ld+json']", (els) => els.map((el) => JSON.parse(el.textContent)["@type"]));
  check("FAQ structured data present", ldTypes.includes("FAQPage"), ldTypes.join(","));
  await shot(page, "faq");
  await page.close();

  // ── Trust: certificate request ─────────────────────────────
  page = await open("/trust");
  await page.type("#coi-name", "Pat Manager");
  await page.type("#coi-email", "pat@hoa.example.com");
  await page.type("#coi-address", "212 W Central Ave, Bentonville");
  await page.click("button::-p-text(Request certificate)");
  await page.waitForSelector("[role=status]", { timeout: 10000 });
  check("certificate request confirms", true);
  await shot(page, "trust");
  await page.close();

  // ── Screenshots of remaining pages ─────────────────────────
  for (const [name, route] of [["reviews", "/reviews"], ["home", "/"]]) {
    page = await open(route);
    await shot(page, name);
    await page.close();
    page = await open(route, 390, 844);
    await shot(page, `${name}-mobile`);
    await page.close();
  }
} catch (error) {
  check("script completed", false, error.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
