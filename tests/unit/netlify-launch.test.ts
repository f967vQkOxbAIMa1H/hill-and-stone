import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { newQuoteInput } from "@/lib/admin/builder-initial";
import { buildFaq } from "@/lib/faq";
import { buildSite, defaultSettings } from "@/lib/site";

const withTripFee = (tripFee: string) => buildSite({ ...defaultSettings, quoteDefaults: { ...defaultSettings.quoteDefaults, tripFee } });
const faqText = (tripFee: string) => JSON.stringify(buildFaq(withTripFee(tripFee)));

describe("trip fee", () => {
  it("leaves the trip fee out of the FAQ while it's $0", () => {
    expect(faqText("0")).not.toMatch(/trip fee/i);
    expect(faqText("75")).toContain("What's the trip fee for?");
  });
  it("starts new quotes without a trip fee line while it's $0", () => {
    const lead = { id: "lead_1", category: "INTERIOR_REPAIRS" } as Parameters<typeof newQuoteInput>[0];
    expect(newQuoteInput(lead, withTripFee("0").quoteDefaults).lines.map((l) => l.type)).toEqual(["LABOR", "MATERIALS"]);
    expect(newQuoteInput(lead, withTripFee("75").quoteDefaults).lines.at(-1)).toMatchObject({ type: "TRIP_FEE", unitPrice: "75" });
  });
});

describe("Netlify readiness", () => {
  it("serves the same security headers from netlify.toml as next.config", async () => {
    const toml = readFileSync("netlify.toml", "utf8");
    const all = (await nextConfig.headers!()).find((r) => r.source === "/:path*")!.headers;
    for (const { key, value } of all) expect(toml).toContain(`${key} = "${value}"`);
  });
  it("pins the same Node version in .nvmrc, netlify.toml and engines", () => {
    const nvmrc = readFileSync(".nvmrc", "utf8").trim();
    expect(readFileSync("netlify.toml", "utf8")).toContain(`NODE_VERSION = "${nvmrc}"`);
    expect(JSON.parse(readFileSync("package.json", "utf8")).engines.node).toBe(`>=${nvmrc}`);
  });
  it("has no Vercel config left", () => expect(existsSync("vercel.json")).toBe(false));
});
