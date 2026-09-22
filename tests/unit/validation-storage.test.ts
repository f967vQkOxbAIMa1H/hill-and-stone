import { describe, expect, it } from "vitest";
import { flattenErrors, quoteRequestSchema } from "@/lib/quote-request/schema";
import { resolveKey, sniffImage } from "@/lib/storage";

const valid = {
  firstName: "Jordan",
  lastName: "Ellis",
  email: " Jordan@Example.com ",
  phone: "+1 (479) 555-0177",
  line1: "212 W Central Ave",
  line2: "",
  city: "Bentonville",
  postalCode: "72712",
  preferredContact: "TEXT",
  category: "CARPENTRY_DOORS_TRIM",
  description: "Back door sticks at the top and the trim is soft.",
  timeline: "FLEXIBLE",
  budgetRange: "NOT_SURE",
};

describe("quote request schema", () => {
  it("normalizes email and phone", () => {
    const r = quoteRequestSchema.parse(valid);
    expect(r.email).toBe("jordan@example.com");
    expect(r.phone).toBe("4795550177");
  });
  it("gives a plain message per bad field", () => {
    const r = quoteRequestSchema.safeParse({ ...valid, phone: "555", postalCode: "7271", category: "ROOFING" });
    expect(r.success).toBe(false);
    const errors = flattenErrors(r.error!);
    expect(errors.phone).toMatch(/10-digit/);
    expect(errors.postalCode).toMatch(/5-digit/);
    expect(errors.category).toBe("Choose the kind of work.");
  });
});

describe("storage", () => {
  it("identifies images by content", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))?.mime).toBe("image/webp");
    expect(sniffImage(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
  });
  it("refuses keys that escape the storage folder", () => {
    expect(() => resolveKey("../../etc/passwd")).toThrow();
    expect(() => resolveKey("/etc/passwd")).toThrow();
    expect(resolveKey("leads/2026-09/abc.png")).toMatch(/storage[\\/]leads[\\/]2026-09[\\/]abc\.png$/);
  });
});
