import { describe, expect, it } from "vitest";
import { changePasswordSchema, newStaffSchema } from "@/lib/admin/team-schema";
import { can, capabilitiesOf } from "@/lib/auth/permissions";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { settingsSchema } from "@/lib/settings/schema";
import { buildSite, defaultSettings } from "@/lib/site";

describe("role permissions", () => {
  it("only owners manage the team and site settings", () => {
    for (const role of ["ADMIN", "STAFF", "TECHNICIAN", "CUSTOMER"]) {
      expect(can(role, "manageTeam")).toBe(false);
      expect(can(role, "manageSettings")).toBe(false);
    }
    expect(can("OWNER", "manageTeam")).toBe(true);
    expect(can("OWNER", "manageSettings")).toBe(true);
  });
  it("technicians work requests but can't change quotes, content or see revenue", () => {
    expect(capabilitiesOf("TECHNICIAN")).toEqual(["workRequests"]);
  });
  it("staff build quotes but can't void them or see revenue", () => {
    expect(can("STAFF", "manageQuotes")).toBe(true);
    expect(can("STAFF", "voidQuotes")).toBe(false);
    expect(can("STAFF", "viewFinancials")).toBe(false);
  });
  it("customers have no admin capabilities", () => expect(capabilitiesOf("CUSTOMER")).toEqual([]));
});

describe("team inputs", () => {
  it("requires a real temporary password", () => {
    const base = { name: "Terry Tech", email: "Terry@Example.com", role: "TECHNICIAN" as const };
    expect(newStaffSchema.safeParse({ ...base, tempPassword: "short" }).success).toBe(false);
    expect(newStaffSchema.safeParse({ ...base, tempPassword: "aaaaaaaaaaaaaa" }).success).toBe(false);
    const ok = newStaffSchema.parse({ ...base, tempPassword: generateTempPassword() });
    expect(ok.email).toBe("terry@example.com");
  });
  it("generates readable temporary passwords", () => {
    const p = generateTempPassword();
    expect(p).toMatch(/^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/);
    expect(new Set(Array.from({ length: 50 }, generateTempPassword)).size).toBe(50);
  });
  it("checks password changes", () => {
    expect(changePasswordSchema.safeParse({ current: "old-password-1", next: "new-password-22", confirm: "new-password-2" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: "same-password-1", next: "same-password-1", confirm: "same-password-1" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: "old-password-1", next: "a sturdy new phrase", confirm: "a sturdy new phrase" }).success).toBe(true);
  });
});

describe("site settings", () => {
  it("defaults are valid", () => expect(settingsSchema.safeParse(defaultSettings).success).toBe(true));
  it("rejects bad values with plain messages", () => {
    const r = settingsSchema.safeParse({
      ...defaultSettings,
      contact: { ...defaultSettings.contact, phone: "12345" },
      quoteDefaults: { ...defaultSettings.quoteDefaults, taxRatePercent: "45" },
      googleReviewsUrl: "http://insecure.example",
    });
    expect(r.success).toBe(false);
    const byPath = Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(byPath["contact.phone"]).toMatch(/10-digit/);
    expect(byPath["quoteDefaults.taxRatePercent"]).toMatch(/too high/);
    expect(byPath.googleReviewsUrl).toMatch(/https/);
  });
  it("turns blank optional fields into null", () => {
    const s = settingsSchema.parse({ ...defaultSettings, license: { number: "  " }, story: { ...defaultSettings.story, foundedYear: "", crewSize: "4" } });
    expect(s.license.number).toBeNull();
    expect(s.story.foundedYear).toBeNull();
    expect(s.story.crewSize).toBe(4);
  });
  it("derives what the site shows", () => {
    const site = buildSite({
      ...defaultSettings,
      contact: { ...defaultSettings.contact, phone: "479.200.1234" },
      insurance: [{ type: "General liability", detail: "$2,000,000" }, ...defaultSettings.insurance.slice(1)],
      license: { number: null, showPublicly: true },
      warrantyMonths: 24,
      policies: { ...defaultSettings.policies, replyBusinessDays: 2 },
    });
    expect(site.phoneHref).toBe("tel:+14792001234");
    expect(site.phoneIsPlaceholder).toBe(false);
    expect(buildSite(defaultSettings).phoneIsPlaceholder).toBe(true);
    expect(site.insuranceSummary).toBe("Insured: $2,000,000 general liability");
    expect(site.warranty).toBe("2-year workmanship warranty");
    expect(site.replyWindow).toBe("two business days");
  });
});
