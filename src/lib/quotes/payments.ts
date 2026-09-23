import "server-only";
import { after } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { acceptedNotice, declinedNotice, paymentReceipt } from "@/lib/email/quote-templates";
import { env } from "@/lib/env";
import { site } from "@/lib/site";
import { getStripe, PAYMENT_METHOD_TYPES } from "@/lib/stripe";
import type { PortalQuote } from "./queries";
import { amountFor, balanceCents, portalState, statusAfterPayment, type DeclineReason, type PaymentOption } from "./state";

export class QuoteActionError extends Error {
  constructor(
    public code: "not_available" | "payments_unavailable" | "stripe_error",
    message: string,
  ) {
    super(message);
  }
}

const quoteUrl = (token: string) => `${env.NEXT_PUBLIC_APP_URL}/quote/${token}`;
const formatAddress = (a: PortalQuote["address"]) =>
  a ? `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.postalCode}` : "(no address)";

type QuoteForInfo = Pick<PortalQuote, "number" | "title" | "totalCents" | "customer" | "address" | "publicToken">;

function quoteInfo(q: QuoteForInfo) {
  return {
    number: q.number,
    title: q.title,
    totalCents: q.totalCents,
    customerName: `${q.customer.firstName} ${q.customer.lastName}`,
    customerEmail: q.customer.email,
    address: formatAddress(q.address),
    url: quoteUrl(q.publicToken),
  };
}

// ─── Checkout ───────────────────────────────────────────────────────────────

/** Creates a Stripe Checkout session for a payment option. The amount always comes from the database. */
export async function createCheckout(quote: PortalQuote, option: PaymentOption) {
  const stripe = getStripe();
  if (!stripe) throw new QuoteActionError("payments_unavailable", `Online payment isn't set up yet. Call ${site.phone} to pay by phone.`);

  const amount = amountFor(quote, option);
  if (amount === null || amount <= 0) {
    throw new QuoteActionError("not_available", "This quote can't be paid right now. Refresh the page to see its current status.");
  }

  // Close any earlier unfinished checkouts so the same quote can't be paid twice from two tabs.
  const stale = quote.payments.filter((p) => p.status === "PENDING" && p.stripeCheckoutSessionId);
  await Promise.allSettled(stale.map((p) => stripe.checkout.sessions.expire(p.stripeCheckoutSessionId!)));
  if (stale.length) {
    await db.payment.updateMany({ where: { id: { in: stale.map((p) => p.id) }, status: "PENDING" }, data: { status: "CANCELED" } });
  }

  const payment = await db.payment.create({
    data: { quoteId: quote.id, amountCents: amount, currency: quote.currency, isDeposit: option === "deposit" },
  });

  const label = option === "deposit" ? "Deposit" : option === "balance" ? "Remaining balance" : "Payment in full";
  const metadata = { quoteId: quote.id, paymentId: payment.id, option, quoteNumber: String(quote.number) };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: [...PAYMENT_METHOD_TYPES],
        customer_email: quote.customer.email,
        client_reference_id: quote.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: quote.currency,
              unit_amount: amount,
              product_data: { name: `${label}: quote #${quote.number}`, description: quote.title.slice(0, 250) },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata, description: `${label} for Hill & Stone quote #${quote.number}` },
        success_url: `${quoteUrl(quote.publicToken)}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${quoteUrl(quote.publicToken)}?canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      { idempotencyKey: `checkout-${payment.id}` },
    );

    await db.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id } });
    await db.quoteEvent.create({
      data: { quoteId: quote.id, type: "PAYMENT_STARTED", metadata: { paymentId: payment.id, option, amountCents: amount } },
    });
    if (!session.url) throw new Error("Checkout session has no URL");
    return session.url;
  } catch (error) {
    console.error("Checkout session create failed", error);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new QuoteActionError("stripe_error", `Checkout didn't open. Try again, or call ${site.phone} to pay by phone.`);
  }
}

// ─── Fulfillment (webhook and return page both call this) ───────────────────

type FulfillResult = { state: "fulfilled" | "already" | "processing" | "ignored" };

/**
 * Records a completed Checkout session. Idempotent: the webhook and the success page can both
 * call it, and only the first caller that flips the payment to SUCCEEDED sends emails.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfillResult> {
  const payment = await db.payment.findFirst({
    where: session.metadata?.paymentId ? { id: session.metadata.paymentId } : { stripeCheckoutSessionId: session.id },
  });
  if (!payment || (payment.stripeCheckoutSessionId && payment.stripeCheckoutSessionId !== session.id)) {
    console.warn("fulfill: no matching payment for session", session.id);
    return { state: "ignored" };
  }

  if (session.payment_status !== "paid") {
    // Some methods settle later; async_payment_succeeded will finish the job.
    if (session.status === "complete") {
      await db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "PROCESSING" } });
    }
    return { state: "processing" };
  }

  if (session.amount_total !== payment.amountCents || session.currency !== payment.currency) {
    console.error("fulfill: amount mismatch", { session: session.id, expected: payment.amountCents, got: session.amount_total });
    return { state: "ignored" };
  }

  const details = await paymentDetails(session);
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const flipped = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCEEDED" } },
      data: { status: "SUCCEEDED", paidAt: now, stripeCheckoutSessionId: session.id, ...details },
    });
    if (flipped.count === 0) return null;

    const quote = await tx.quote.findUniqueOrThrow({
      where: { id: payment.quoteId },
      include: { payments: true },
    });
    const nextStatus = statusAfterPayment(quote);
    const firstAcceptance = !quote.acceptedAt;
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: nextStatus, acceptedAt: quote.acceptedAt ?? now },
    });
    if (firstAcceptance) await tx.quoteEvent.create({ data: { quoteId: quote.id, type: "ACCEPTED" } });
    await tx.quoteEvent.create({
      data: { quoteId: quote.id, type: "PAID", metadata: { paymentId: payment.id, amountCents: payment.amountCents, sessionId: session.id } },
    });
    if (quote.leadId) await tx.lead.update({ where: { id: quote.leadId }, data: { status: "ACCEPTED" } });
    await tx.conversionEvent.create({
      data: { name: payment.isDeposit ? "quote_deposit_paid" : "quote_paid", quoteId: quote.id, valueCents: payment.amountCents },
    });
    return { balance: balanceCents(quote) };
  });

  if (!result) return { state: "already" };

  after(async () => {
    const quote = await db.quote.findUnique({
      where: { id: payment.quoteId },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        address: true,
      },
    });
    if (!quote) return;
    const info = quoteInfo(quote);
    const pay = { amountCents: payment.amountCents, balanceCents: result.balance, paidAt: now, isDeposit: payment.isDeposit, ...details };
    await sendEmail({ type: "PAYMENT_RECEIPT", to: quote.customer.email, quoteId: quote.id, replyTo: site.email, ...paymentReceipt({ ...info, customerName: quote.customer.firstName }, pay) });
    if (env.CONTRACTOR_NOTIFY_EMAIL) {
      await sendEmail({ type: "QUOTE_ACCEPTED_NOTICE", to: env.CONTRACTOR_NOTIFY_EMAIL, quoteId: quote.id, replyTo: quote.customer.email, ...acceptedNotice(info, pay) });
    }
  });

  return { state: "fulfilled" };
}

/** Card brand, last 4 and receipt link from the PaymentIntent. Best effort: fulfillment never waits on this failing. */
async function paymentDetails(session: Stripe.Checkout.Session) {
  const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const base = { stripePaymentIntentId: intentId ?? null, method: null as string | null, cardBrand: null as string | null, cardLast4: null as string | null, receiptUrl: null as string | null };
  const stripe = getStripe();
  if (!intentId || !stripe) return base;
  try {
    const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
    const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const pmd = charge?.payment_method_details;
    return {
      ...base,
      method: pmd?.card?.wallet?.type ?? pmd?.type ?? null,
      cardBrand: pmd?.card?.brand ?? null,
      cardLast4: pmd?.card?.last4 ?? null,
      receiptUrl: charge?.receipt_url ?? null,
    };
  } catch (error) {
    console.warn("paymentDetails: could not load PaymentIntent", intentId, error);
    return base;
  }
}

export async function markSessionEnded(session: Stripe.Checkout.Session, outcome: "FAILED" | "CANCELED") {
  const payment = await db.payment.findUnique({ where: { stripeCheckoutSessionId: session.id } });
  if (!payment) return;
  const changed = await db.payment.updateMany({
    where: { id: payment.id, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: outcome },
  });
  if (changed.count && outcome === "FAILED") {
    await db.quoteEvent.create({ data: { quoteId: payment.quoteId, type: "PAYMENT_FAILED", metadata: { paymentId: payment.id, sessionId: session.id } } });
  }
}

// ─── Decline ────────────────────────────────────────────────────────────────

export async function declineQuote(
  quote: PortalQuote,
  reason: DeclineReason,
  note: string | null,
  meta: { ipAddress?: string; userAgent?: string },
) {
  if (portalState(quote) !== "open") {
    throw new QuoteActionError("not_available", "This quote can't be declined anymore. Refresh the page to see its current status.");
  }
  const now = new Date();
  const changed = await db.$transaction(async (tx) => {
    // Guard against a race with a payment that just completed.
    const res = await tx.quote.updateMany({
      where: { id: quote.id, status: { in: ["SENT", "VIEWED"] } },
      data: { status: "DECLINED", declinedAt: now, declineReason: reason, declineNote: note },
    });
    if (res.count === 0) return false;
    await tx.quoteEvent.create({ data: { quoteId: quote.id, type: "DECLINED", metadata: { reason, note }, ...meta } });
    if (quote.leadId) await tx.lead.update({ where: { id: quote.leadId }, data: { status: "DECLINED" } });
    return true;
  });
  if (!changed) throw new QuoteActionError("not_available", "This quote was just updated. Refresh the page to see its current status.");

  // Close open checkouts so a declined quote can't be paid.
  const stripe = getStripe();
  const pending = quote.payments.filter((p) => p.status === "PENDING" && p.stripeCheckoutSessionId);
  if (stripe && pending.length) {
    await Promise.allSettled(pending.map((p) => stripe.checkout.sessions.expire(p.stripeCheckoutSessionId!)));
    await db.payment.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "CANCELED" } });
  }

  after(async () => {
    await sendEmail({
      type: "QUOTE_DECLINED_NOTICE",
      to: env.CONTRACTOR_NOTIFY_EMAIL ?? site.email,
      quoteId: quote.id,
      replyTo: quote.customer.email,
      ...declinedNotice(quoteInfo(quote), reason, note),
    });
  });
}
