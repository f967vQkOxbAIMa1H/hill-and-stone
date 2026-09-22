import { describe, expect, it } from "vitest";
import {
  amountFor,
  balanceCents,
  depositCents,
  isValidTokenFormat,
  portalState,
  statusAfterPayment,
  type QuoteForState,
} from "@/lib/quotes/state";

const now = new Date("2026-09-22T12:00:00Z");
const quote = (over: Partial<QuoteForState> = {}): QuoteForState => ({
  status: "SENT",
  validUntil: new Date("2026-10-22T12:00:00Z"),
  totalCents: 100_000,
  depositBps: 5000,
  payments: [],
  ...over,
});
const paid = (amountCents: number) => ({ status: "SUCCEEDED", amountCents });

describe("portalState", () => {
  it("hides drafts", () => expect(portalState(quote({ status: "DRAFT" }), now)).toBe("hidden"));
  it("is open when sent or viewed and in date", () => {
    expect(portalState(quote({ status: "SENT" }), now)).toBe("open");
    expect(portalState(quote({ status: "VIEWED" }), now)).toBe("open");
  });
  it("expires after validUntil", () => {
    expect(portalState(quote({ validUntil: new Date("2026-09-21T00:00:00Z") }), now)).toBe("expired");
    expect(portalState(quote({ status: "EXPIRED" }), now)).toBe("expired");
  });
  it("stays open with no expiry date", () => expect(portalState(quote({ validUntil: null }), now)).toBe("open"));
  it("reports deposit-paid and paid", () => {
    expect(portalState(quote({ status: "ACCEPTED", payments: [paid(50_000)] }), now)).toBe("partially_paid");
    expect(portalState(quote({ status: "ACCEPTED", payments: [paid(100_000)] }), now)).toBe("paid");
    expect(portalState(quote({ status: "PAID" }), now)).toBe("paid");
  });
  it("reports declined and void", () => {
    expect(portalState(quote({ status: "DECLINED" }), now)).toBe("declined");
    expect(portalState(quote({ status: "VOID" }), now)).toBe("void");
  });
  it("paid quotes don't expire", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    expect(portalState(quote({ status: "PAID", validUntil: past }), now)).toBe("paid");
  });
});

describe("amounts", () => {
  it("computes deposit and balance", () => {
    expect(depositCents(quote({ totalCents: 123_457, depositBps: 5000 }))).toBe(61_729); // rounds half up
    expect(balanceCents(quote({ payments: [paid(30_000), { status: "FAILED", amountCents: 70_000 }] }))).toBe(70_000);
    expect(balanceCents(quote({ payments: [paid(120_000)] }))).toBe(0); // never negative
  });

  it("offers deposit and full only while open", () => {
    expect(amountFor(quote(), "deposit", now)).toBe(50_000);
    expect(amountFor(quote(), "full", now)).toBe(100_000);
    expect(amountFor(quote(), "balance", now)).toBeNull();
    expect(amountFor(quote({ depositBps: 0 }), "deposit", now)).toBeNull();
    expect(amountFor(quote({ status: "DECLINED" }), "full", now)).toBeNull();
    expect(amountFor(quote({ validUntil: new Date("2026-09-01T00:00:00Z") }), "full", now)).toBeNull();
  });

  it("offers only the balance after a deposit", () => {
    const q = quote({ status: "ACCEPTED", payments: [paid(50_000)] });
    expect(amountFor(q, "balance", now)).toBe(50_000);
    expect(amountFor(q, "full", now)).toBeNull();
    expect(amountFor(q, "deposit", now)).toBeNull();
  });

  it("moves to PAID only when the balance is zero", () => {
    expect(statusAfterPayment(quote({ payments: [paid(50_000)] }))).toBe("ACCEPTED");
    expect(statusAfterPayment(quote({ payments: [paid(50_000), paid(50_000)] }))).toBe("PAID");
  });
});

describe("token format", () => {
  it("accepts 43-char base64url tokens only", () => {
    expect(isValidTokenFormat("p3ja2bqo940LWNsckO1gpfJCEDKCJ1Zlf-ZClJyPlHA")).toBe(true);
    expect(isValidTokenFormat("short")).toBe(false);
    expect(isValidTokenFormat("p3ja2bqo940LWNsckO1gpfJCEDKCJ1Zlf-ZClJyPlH/")).toBe(false);
    expect(isValidTokenFormat("' OR 1=1 --' OR 1=1 --' OR 1=1 --' OR 1=1 -")).toBe(false);
  });
});

describe("fixed deposits", () => {
  it("uses the fixed amount over the percentage, capped at the total", () => {
    expect(depositCents(quote({ depositBps: 5000, depositFixedCents: 25_000 }))).toBe(25_000);
    expect(depositCents(quote({ depositFixedCents: 500_000 }))).toBe(100_000);
    expect(amountFor(quote({ depositBps: 0, depositFixedCents: 25_000 }), "deposit", now)).toBe(25_000);
  });
  it("offers no deposit option when the deposit equals the total", () => {
    expect(amountFor(quote({ depositFixedCents: 100_000 }), "deposit", now)).toBeNull();
  });
});
