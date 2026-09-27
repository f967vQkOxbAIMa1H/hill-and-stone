import { describe, expect, it } from "vitest";
import { computeTotals, quoteDraftSchema, type QuoteDraftInput } from "@/lib/admin/quote-schema";

const base: QuoteDraftInput = {
  leadId: "lead_1",
  title: "Front door trim",
  scopeOfWork: "Replace rotted brickmould and casing, then paint to match.",
  exclusions: "",
  validDays: 30,
  taxRatePercent: "9.75",
  lines: [
    { type: "LABOR", description: "Labor", quantity: "4.5", unitPrice: "85" },
    { type: "MATERIALS", description: "PVC trim", quantity: "3", unitPrice: "$42.00" },
    { type: "TRIP_FEE", description: "Trip fee", quantity: "1", unitPrice: "75" },
    { type: "DISCOUNT", description: "Returning customer", quantity: "1", unitPrice: "25" },
  ],
};

describe("quote builder", () => {
  it("computes totals in cents with discounts negative", () => {
    const t = computeTotals(base);
    expect(t.items.map((i) => i.totalCents)).toEqual([38_250, 12_600, 7_500, -2_500]);
    expect(t.subtotalCents).toBe(55_850);
    expect(t.taxCents).toBe(5_445);
    expect(t.totalCents).toBe(61_295);
  });
  it("never sets a deposit: payment is due on completion", () => {
    const t = computeTotals(base);
    expect(t.depositBps).toBe(0);
    expect(t.depositFixedCents).toBeNull();
    // Deposit fields from an old client are ignored, not stored.
    const r = quoteDraftSchema.safeParse({ ...base, depositMode: "percent", depositPercent: "50" });
    expect(r.success && "depositMode" in r.data).toBe(false);
  });
  it("rejects bad numbers with plain messages", () => {
    const r = quoteDraftSchema.safeParse({ ...base, lines: [{ type: "LABOR", description: "x", quantity: "0", unitPrice: "abc" }] });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Quantity must be more than 0.");
    expect(messages).toContain("Enter an amount like 85 or 85.50.");
  });
  it("requires a positive total", () => {
    expect(quoteDraftSchema.safeParse({ ...base, lines: [base.lines[3]] }).success).toBe(false);
    expect(quoteDraftSchema.safeParse(base).success).toBe(true);
  });
});
