import { describe, expect, it } from "vitest";
import { reviewSchema } from "@/lib/admin/content-schema";
import { clientIp } from "@/lib/rate-limit";
import { driverFromEnv } from "@/lib/storage/drivers";
import { isPublicRating, LOW_RATING_SUBJECT_TAG, reviewSubmissionSchema, routeReview } from "@/lib/reviews";
import { lookupZip, serviceAreaSlug } from "@/lib/service-area";
import { settingsSchema } from "@/lib/settings/schema";
import { brand, buildSite, defaultSettings } from "@/lib/site";
import { storyParagraphs } from "@/lib/story";

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
    const ok = reviewSubmissionSchema.safeParse({ rating: "4", authorName: "Jordan E.", city: "Fayetteville", email: "J@Example.com", body: "Fixed our <b>sticking</b> door in an hour." });
    expect(ok.success && ok.data).toMatchObject({ rating: 4, email: "j@example.com", body: "Fixed our sticking door in an hour." });
    expect(reviewSubmissionSchema.safeParse({ rating: 0, authorName: "Jo", city: "Rogers", email: "a@b.co", body: "Long enough text" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ rating: 6, authorName: "Jo", city: "Rogers", email: "a@b.co", body: "Long enough text" }).success).toBe(false);
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
  it("hides license and insurance details until made public", () => {
    const withDetails = settingsSchema.parse({
      ...defaultSettings,
      license: { number: "0123456", showPublicly: false },
      insurance: defaultSettings.insurance.map((i) => ({ ...i, detail: "$1,000,000" })),
    });
    const hidden = buildSite(withDetails);
    expect(hidden.licenseNumber).toBeNull();
    expect(hidden.insurance).toEqual([]);
    expect(hidden.insuranceSummary).toBeNull();
    expect(hidden.licenseStatement).toBe("Licensed and insured for minor home repair");

    const shown = buildSite({ ...withDetails, license: { number: "0123456", showPublicly: true } });
    expect(shown.licenseNumber).toBe("0123456");
    expect(shown.insurance).toHaveLength(3);
  });
  it("defaults to hidden, even for settings saved before the toggle existed", () => {
    expect(defaultSettings.license.showPublicly).toBe(false);
    expect(settingsSchema.parse({ ...defaultSettings, license: { number: "9" } }).license.showPublicly).toBe(false);
  });
  it("uses the Hillstone domain and no LLC until it's registered", () => {
    expect(brand.domain).toMatch(/^hillstone/);
    expect(defaultSettings.contact.email).toBe(`hello@${brand.domain}`);
    expect(brand.legalName).not.toMatch(/LLC/);
  });
  it("has no deposit setting", () => expect("depositPercent" in defaultSettings.quoteDefaults).toBe(false));
});

describe("origin story", () => {
  const story = defaultSettings.story;
  it("names both co-founders when set", () => {
    expect(storyParagraphs({ ...story, founderName: "Tucker", coFounderName: "Sam" })[0]).toMatch(/^Tucker and Sam have lived/);
    expect(storyParagraphs({ ...story, founderName: "Tucker", coFounderName: null })[0]).toMatch(/^Tucker has lived/);
    expect(storyParagraphs({ ...story, founderName: null, coFounderName: null })[0]).toMatch(/^Our founders have lived/);
  });
});

describe("security hardening", () => {
  const valid = { authorName: "Jo E.", city: "Rogers", email: "a@b.co", body: "Long enough text here" };
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
