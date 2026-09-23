import "server-only";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

/**
 * Marks sent quotes past their valid-until date as EXPIRED, logs the event and closes any
 * open checkout so an expired quote can't be paid. Idempotent: safe to run as often as you like.
 * (The client portal already treats these as expired on the fly; this makes the database agree.)
 */
export async function expireOverdueQuotes(now = new Date()) {
  const overdue = await db.quote.findMany({
    where: { status: { in: ["SENT", "VIEWED"] }, validUntil: { lt: now } },
    select: { id: true, payments: { where: { status: "PENDING" }, select: { id: true, stripeCheckoutSessionId: true } } },
  });

  let expired = 0;
  const stripe = getStripe();
  for (const q of overdue) {
    const changed = await db.$transaction(async (tx) => {
      // Re-check status inside the transaction: a payment or decline may have landed meanwhile.
      const res = await tx.quote.updateMany({ where: { id: q.id, status: { in: ["SENT", "VIEWED"] } }, data: { status: "EXPIRED" } });
      if (res.count) await tx.quoteEvent.create({ data: { quoteId: q.id, type: "EXPIRED", metadata: { by: "scheduled job" } } });
      return res.count > 0;
    });
    if (!changed) continue;
    expired++;
    const open = q.payments.filter((p) => p.stripeCheckoutSessionId);
    if (stripe && open.length) {
      await Promise.allSettled(open.map((p) => stripe.checkout.sessions.expire(p.stripeCheckoutSessionId!)));
      await db.payment.updateMany({ where: { id: { in: open.map((p) => p.id) }, status: "PENDING" }, data: { status: "CANCELED" } });
    }
  }
  return { checked: overdue.length, expired };
}
