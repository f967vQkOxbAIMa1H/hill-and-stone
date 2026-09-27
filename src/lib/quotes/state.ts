// Pure quote rules shared by the portal page, the API routes and tests. No I/O here.
import type { QuoteStatus } from "@/generated/prisma/enums";

export type QuoteForState = {
  status: QuoteStatus;
  validUntil: Date | null;
  totalCents: number;
  depositBps: number;
  depositFixedCents?: number | null;
  paymentRequestedAt?: Date | null;
  payments: { status: string; amountCents: number }[];
};

export type PortalState =
  | "open" // can be accepted (no payment up front) or declined
  | "expired" // past validUntil without a response
  | "accepted" // accepted; work scheduled or underway, nothing due yet
  | "payment_due" // work complete and payment requested (or a legacy deposit left a balance)
  | "paid" // paid in full
  | "declined"
  | "void" // withdrawn by us, or expired and closed
  | "hidden"; // drafts are never shown publicly

/** 32 random bytes as base64url = 43 characters. Checked before touching the database. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const isValidTokenFormat = (token: string) => TOKEN_PATTERN.test(token);

export function paidCents(quote: Pick<QuoteForState, "payments">) {
  return quote.payments.filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + p.amountCents, 0);
}

export function balanceCents(quote: Pick<QuoteForState, "payments" | "totalCents">) {
  return Math.max(0, quote.totalCents - paidCents(quote));
}

/** Legacy deposits (no longer offered). A fixed deposit wins over a percentage, and never exceeds the total. */
export function depositCents(quote: Pick<QuoteForState, "totalCents" | "depositBps" | "depositFixedCents">) {
  if (quote.depositFixedCents != null) return Math.min(Math.max(0, quote.depositFixedCents), quote.totalCents);
  return Math.round((quote.totalCents * quote.depositBps) / 10_000);
}

export const hasDeposit = (quote: Pick<QuoteForState, "totalCents" | "depositBps" | "depositFixedCents">) => {
  const d = depositCents(quote);
  return d > 0 && d < quote.totalCents;
};

export function portalState(quote: QuoteForState, now = new Date()): PortalState {
  switch (quote.status) {
    case "DRAFT":
      return "hidden";
    case "DECLINED":
      return "declined";
    case "VOID":
      return "void";
    case "EXPIRED":
      return "expired";
    case "PAID":
      return "paid";
    case "ACCEPTED":
      if (balanceCents(quote) === 0) return "paid";
      // Payment is due on completion. Older quotes that took a deposit can pay their balance too.
      return quote.paymentRequestedAt || paidCents(quote) > 0 ? "payment_due" : "accepted";
    case "SENT":
    case "VIEWED":
      if (quote.validUntil && quote.validUntil.getTime() < now.getTime()) return "expired";
      return "open";
  }
}

/** Payment is due upon completion: nothing is charged at acceptance, and there are no deposits or plans. */
export type PaymentOption = "balance";

/** Amount the customer can pay now, or null until the job is complete and payment has been requested. */
export function amountDue(quote: QuoteForState, now = new Date()): number | null {
  return portalState(quote, now) === "payment_due" ? balanceCents(quote) : null;
}

/** Accepting is free; it only needs an open quote. */
export const canAccept = (quote: QuoteForState, now = new Date()) => portalState(quote, now) === "open";

/** The owner can mark the job complete and ask for payment once the quote is accepted. */
export const canRequestPayment = (quote: QuoteForState, now = new Date()) => {
  const state = portalState(quote, now);
  return state === "accepted" || state === "payment_due";
};

/** Status after a payment succeeds, given the quote's payments including that one. */
export function statusAfterPayment(quote: Pick<QuoteForState, "payments" | "totalCents">): "ACCEPTED" | "PAID" {
  return balanceCents(quote) === 0 ? "PAID" : "ACCEPTED";
}

export const declineReasons = [
  { value: "PRICE", label: "The price is higher than I expected" },
  { value: "SCOPE", label: "The scope isn't what I need" },
  { value: "POSTPONED", label: "I'm postponing the project" },
  { value: "OTHER_CONTRACTOR", label: "I'm going with another contractor" },
  { value: "OTHER", label: "Something else" },
] as const;
export type DeclineReason = (typeof declineReasons)[number]["value"];
