import { describe, expect, it } from "vitest";
import { compressionSteps, fitWithin } from "@/lib/image-compress";
import { paymentMethodLabel } from "@/lib/quotes/state";
import { reviewSchema } from "@/lib/admin/content-schema";
import { clientIp } from "@/lib/rate-limit";
import { driverFromEnv } from "@/lib/storage/drivers";
import { isPublicRating, LOW_RATING_SUBJECT_TAG, reviewSubmissionSchema, routeReview } from "@/lib/reviews";
import { lookupZip, serviceAreaSlug } from "@/lib/service-area";
import { settingsSchema } from "@/lib/settings/schema";
import { brand, buildSite, defaultSettings } from "@/lib/site";
import { storyParagraphs } from "@/lib/story";

const TOKEN = "p3ja2bqo940LWNsckO1gpfJCEDKCJ1Zlf-ZClJyPlHA";

describe("review routing", () => {
  it("publishes 4 and 5 stars and holds anything lower", () => {
    expect([1, 2, 3, 4, 5].map(isPublicRating)).toEqual([false, false, false, true, true]);
    expect(routeReview(5)).toEqual({ published: true, notifyLowRating: false });
    expect(routeReview(4)).toEqual({ published: true, notifyLowRating: false });
    expect(routeReview(3)).toEqual({ published: false, notifyLowRating: true });
    expect(routeReview(1)).toEqual({ published: false, notifyLowRating: true });
  });
  it("tags low-rating email subjects for the Feedback/Low-Rating folder", () => {
    expect(LOW_RATING_SUBJECT_TAG).toBe("[Feedback/Low-Rating]");
  });
  it("validates submissions and strips HTML", () => {
    const ok = reviewSubmissionSchema.safeParse({ rating: "4", authorName: "Jordan E.", city: "Fayetteville", token: TOKEN, body: "Fixed our <b>sticking</b> door in an hour." });
    expect(ok.success && ok.data).toMatchObject({ rating: 4, body: "Fixed our sticking door in an hour." });
    expect(reviewSubmissionSchema.safeParse({ rating: 0, authorName: "Jo", city: "Rogers", token: TOKEN, body: "Long enough text" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ rating: 6, authorName: "Jo", city: "Rogers", token: TOKEN, body: "Long enough text" }).success).toBe(false);
  });
  it("requires a well-formed private review link token", () => {
    const base = { rating: 5, authorName: "Jo E.", city: "Rogers", body: "Long enough text here" };
    expect(reviewSubmissionSchema.safeParse({ ...base, token: TOKEN }).success).toBe(true);
    for (const token of ["", "short", "' OR 1=1 --", TOKEN + "x", { $ne: "" }]) {
      expect(reviewSubmissionSchema.safeParse({ ...base, token }).success).toBe(false);
    }
  });
  it("won't let an admin publish a review under 4 stars", () => {
    const base = { authorName: "Dana R.", city: "Rogers", body: "They came back and fixed it.", source: "direct", permission: true, published: true };
    expect(reviewSchema.safeParse({ ...base, rating: 3 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, rating: 4 }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...base, rating: 2, published: false }).success).toBe(true);
  });
});

describe("service area ZIP lookup", () => {
  it("covers primary Fayetteville ZIPs", () => {
    for (const zip of ["72701", "72702", "72703", "72704"]) {
      const r = lookupZip(zip);
      expect(r.status === "served" && r.area.slug).toBe("fayetteville");
    }
    expect(serviceAreaSlug("72701")).toBe("fayetteville");
  });
  it("accepts ZIP+4 and whitespace", () => expect(serviceAreaSlug(" 72701-1234 ")).toBe("fayetteville"));
  it("sorts other ZIPs into nearby, outside and invalid", () => {
    expect(lookupZip("72712").status).toBe("served"); // Bentonville
    expect(lookupZip("72761").status).toBe("nearby"); // Siloam Springs: NWA, not listed
    expect(lookupZip("73301").status).toBe("outside");
    expect(lookupZip("7270").status).toBe("invalid");
    expect(serviceAreaSlug("73301")).toBeNull();
  });
});

describe("licensing and branding", () => {
  it("makes no trust claim by default", () => {
    const site = buildSite(defaultSettings);
    expect(Object.values(defaultSettings.claims).every((on) => on === false)).toBe(true);
    expect(site.hasTrustClaims).toBe(false);
    expect(site.credentialLine).toBeNull();
    expect(site.warranty).toBeNull();
    expect(site.licenseNumber).toBeNull();
  });
  it("keeps insurer details hidden until the insured claim is on", () => {
    const withDetails = settingsSchema.parse({
      ...defaultSettings,
      license: { number: "0123456" },
      insurance: defaultSettings.insurance.map((i) => ({ ...i, detail: "$1,000,000" })),
    });
    const off = buildSite(withDetails);
    expect(off.insurance).toEqual([]);
    expect(off.insuranceSummary).toBeNull();
    // The license line needs only the number.
    expect(off.credentialLine).toBe("Arkansas license 0123456.");

    const on = buildSite({ ...withDetails, claims: { ...withDetails.claims, insured: true, bonded: true } });
    expect(on.insurance).toHaveLength(3);
    expect(on.credentialLine).toBe("Insured and bonded. Arkansas license 0123456.");
  });
  it("turns every claim off for settings saved before the claims existed", () => {
    const legacy: Record<string, unknown> = { ...defaultSettings, license: { number: null, showPublicly: true } };
    delete legacy.claims;
    expect(settingsSchema.parse(legacy).claims).toEqual(defaultSettings.claims);
  });
  it("uses the registered domain, the www canonical URL and the exact LLC legal name", () => {
    expect(brand.domain).toBe("hillandstonehome.com");
    expect(brand.url).toBe("https://www.hillandstonehome.com");
    expect(brand.legalName).toBe("Hill and Stone Home Solutions LLC");
  });
  it("has no deposit setting", () => expect("depositPercent" in defaultSettings.quoteDefaults).toBe(false));
  it("defaults to the contact details and pricing the owner entered locally", () => {
    expect(defaultSettings.contact).toEqual({ phone: "870-421-1331", email: "tdavidsonmanagement@outlook.com", hours: "Mon–Fri 8am–12pm, 1pm-5pm" });
    expect(defaultSettings.quoteDefaults).toMatchObject({ tripFee: "0", taxRatePercent: "9.75", validDays: 30 });
  });
});

describe("origin story", () => {
  it("names both co-founders", () => {
    expect(storyParagraphs[0]).toMatch(/^Hill & Stone Home was founded by Aidan Sanders and Tucker Davidson/);
    expect(brand.founders.map((f) => f.name)).toEqual(["Aidan Sanders", "Tucker Davidson"]);
  });
  it("doesn't overclaim for a new business", () => {
    const text = storyParagraphs.join(" ");
    expect(text).not.toMatch(/skilled tradesmen|complete bathroom renovation|Built on Experience/);
  });
});

describe("security hardening", () => {
  const valid = { authorName: "Jo E.", city: "Rogers", token: TOKEN, body: "Long enough text here" };
  it("only accepts a plain number or numeric string as a rating", () => {
    for (const rating of [[5], { $gt: 0 }, "5 OR 1=1", true, null]) {
      expect(reviewSubmissionSchema.safeParse({ ...valid, rating }).success).toBe(false);
    }
    expect(reviewSubmissionSchema.safeParse({ ...valid, rating: "5" }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ ...valid, rating: 4 }).success).toBe(true);
  });
  it("can't be spoofed with a forged leftmost X-Forwarded-For", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(h({ "x-forwarded-for": "7.7.7.7, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(h({ "x-vercel-forwarded-for": "198.51.100.2", "x-forwarded-for": "6.6.6.6" }))).toBe("198.51.100.2");
    expect(clientIp(h({ "x-nf-client-connection-ip": "192.0.2.44", "x-forwarded-for": "6.6.6.6" }))).toBe("192.0.2.44");
    expect(clientIp(h({}))).toBe("unknown");
  });
});

describe("storage driver selection", () => {
  it("picks Netlify Blobs, local or S3, and refuses typos", () => {
    expect(driverFromEnv({ STORAGE_DRIVER: "netlify" }).name).toBe("netlify");
    expect(driverFromEnv({}).name).toBe("local");
    expect(() => driverFromEnv({ STORAGE_DRIVER: "S3 " })).toThrow(/STORAGE_BUCKET/);
    expect(() => driverFromEnv({ STORAGE_DRIVER: "netlfy" })).toThrow(/Unknown STORAGE_DRIVER/);
  });
});

describe("photo shrinking plan", () => {
  it("fits the long edge and never upscales", () => {
    expect(fitWithin(4032, 3024, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032, 2000)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
  it("steps size and quality down until a photo fits", () => {
    const steps = compressionSteps(2000);
    expect(steps[0]).toEqual({ edge: 2000, quality: 0.82 });
    expect(steps.every((s, i) => i === 0 || (s.edge < steps[i - 1].edge && s.quality < steps[i - 1].quality))).toBe(true);
  });
});

describe("payment method labels", () => {
  it("names card, wallet and offline payments", () => {
    expect(paymentMethodLabel({ method: "card", cardBrand: "visa", cardLast4: "4242" })).toBe("Visa ending 4242");
    expect(paymentMethodLabel({ method: "apple_pay" })).toBe("Apple Pay");
    expect(paymentMethodLabel({ method: "cash" })).toBe("Cash");
    expect(paymentMethodLabel({ method: "check" })).toBe("Check");
    expect(paymentMethodLabel({ method: "other" })).toBe("Paid in person");
    expect(paymentMethodLabel({ method: null })).toBe("Card");
  });
});
