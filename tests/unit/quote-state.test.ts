import { describe, expect, it } from "vitest";
import {
  amountDue,
  balanceCents,
  canAccept,
  canRequestPayment,
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
  depositBps: 0,
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
  it("is accepted with nothing due until payment is requested", () => {
    expect(portalState(quote({ status: "ACCEPTED" }), now)).toBe("accepted");
    expect(portalState(quote({ status: "ACCEPTED", paymentRequestedAt: now }), now)).toBe("payment_due");
  });
  it("reports legacy deposit-paid quotes as payment due, and paid", () => {
    expect(portalState(quote({ status: "ACCEPTED", payments: [paid(50_000)] }), now)).toBe("payment_due");
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

  it("charges nothing at acceptance: payment is due on completion", () => {
    expect(amountDue(quote(), now)).toBeNull();
    expect(canAccept(quote(), now)).toBe(true);
    expect(amountDue(quote({ status: "ACCEPTED" }), now)).toBeNull();
    expect(canAccept(quote({ status: "ACCEPTED" }), now)).toBe(false);
    expect(canAccept(quote({ validUntil: new Date("2026-09-01T00:00:00Z") }), now)).toBe(false);
  });

  it("opens payment for the full balance once the job is complete", () => {
    const done = quote({ status: "ACCEPTED", paymentRequestedAt: now });
    expect(amountDue(done, now)).toBe(100_000);
    expect(amountDue({ ...done, payments: [paid(100_000)] }, now)).toBeNull();
    expect(amountDue(quote({ status: "DECLINED", paymentRequestedAt: now }), now)).toBeNull();
  });

  it("lets the owner request payment only on accepted quotes", () => {
    expect(canRequestPayment(quote(), now)).toBe(false);
    expect(canRequestPayment(quote({ status: "ACCEPTED" }), now)).toBe(true);
    expect(canRequestPayment(quote({ status: "ACCEPTED", paymentRequestedAt: now }), now)).toBe(true);
    expect(canRequestPayment(quote({ status: "PAID" }), now)).toBe(false);
  });

  it("still bills the balance on legacy deposit quotes", () => {
    expect(amountDue(quote({ status: "ACCEPTED", depositBps: 5000, payments: [paid(50_000)] }), now)).toBe(50_000);
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

describe("legacy fixed deposits", () => {
  it("uses the fixed amount over the percentage, capped at the total", () => {
    expect(depositCents(quote({ depositBps: 5000, depositFixedCents: 25_000 }))).toBe(25_000);
    expect(depositCents(quote({ depositFixedCents: 500_000 }))).toBe(100_000);
  });
});
