import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { CheckCircle2, Clock, Info } from "lucide-react";
import { QuoteActions, type ActionProps } from "@/components/quote-portal/quote-actions";
import { TrackOnce } from "@/components/analytics/google-analytics";
import { QuoteDocument } from "@/components/quote-portal/quote-document";
import { Container } from "@/components/ui/container";
import { clientIp } from "@/lib/rate-limit";
import { fulfillCheckoutSession } from "@/lib/quotes/payments";
import { getQuoteByToken, recordView, type PortalQuote } from "@/lib/quotes/queries";
import { balanceCents, depositCents, hasDeposit, portalState } from "@/lib/quotes/state";
import { getSite } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

// Always render fresh: this page shows live payment state for one customer.
export const dynamic = "force-dynamic";

type Notice = "paid" | "processing" | "canceled" | null;

/**
 * Returning from Checkout. The webhook usually lands first, but if it hasn't, confirm with
 * Stripe directly so the customer sees the right state immediately. Fulfillment is idempotent.
 */
async function confirmReturn(quote: PortalQuote, sessionId: string): Promise<Notice> {
  const payment = quote.payments.find((p) => p.stripeCheckoutSessionId === sessionId);
  if (!payment) return null; // not a session for this quote: ignore
  if (payment.status === "SUCCEEDED") return "paid";
  const stripe = getStripe();
  if (!stripe) return "processing";
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const result = await fulfillCheckoutSession(session);
    return result.state === "fulfilled" || result.state === "already" ? "paid" : "processing";
  } catch (error) {
    console.error("confirmReturn failed", error);
    return "processing";
  }
}

function methodLabel(p: PortalQuote["payments"][number]) {
  if (p.cardBrand && p.cardLast4) return `${p.cardBrand[0].toUpperCase()}${p.cardBrand.slice(1)} ending ${p.cardLast4}`;
  if (p.method === "cashapp") return "Cash App Pay";
  if (p.method === "apple_pay") return "Apple Pay";
  return "Card";
}

export default async function QuotePage({ params, searchParams }: PageProps<"/quote/[token]">) {
  const { token } = await params;
  const sp = await searchParams;

  let quote = await getQuoteByToken(token);
  if (!quote) notFound();

  let notice: Notice = sp.canceled ? "canceled" : null;
  if (typeof sp.session_id === "string") {
    notice = await confirmReturn(quote, sp.session_id);
    if (notice === "paid") quote = (await getQuoteByToken(token))!;
  }

  const h = await headers();
  const quoteId = quote.id;
  after(() => recordView(quoteId, { ipAddress: clientIp(h), userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined }));

  const state = portalState(quote);
  const paidNow = typeof sp.session_id === "string" ? quote.payments.find((p) => p.stripeCheckoutSessionId === sp.session_id && p.status === "SUCCEEDED") : undefined;
  const succeeded = quote.payments.filter((p) => p.status === "SUCCEEDED" && p.paidAt);
  const actions: ActionProps = {
    token: quote.publicToken,
    number: quote.number,
    state,
    totalCents: quote.totalCents,
    depositLabel: hasDeposit(quote) ? (quote.depositFixedCents != null ? "Deposit" : `Deposit (${quote.depositBps / 100}%)`) : null,
    depositCents: depositCents(quote),
    balanceCents: balanceCents(quote),
    payments: succeeded.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      paidAt: p.paidAt!.toISOString(),
      method: methodLabel(p),
      receiptUrl: p.receiptUrl,
    })),
    declinedAt: quote.declinedAt?.toISOString() ?? null,
    validUntil: quote.validUntil?.toISOString() ?? null,
  };

  return (
    <Container className="py-8 sm:py-12">
      {notice && <NoticeBanner notice={notice} email={quote.customer.email} replyWindow={(await getSite()).replyWindow} />}
      {notice === "paid" && typeof sp.session_id === "string" && paidNow && (
        <TrackOnce
          event="purchase"
          onceKey={sp.session_id}
          params={{ transaction_id: `quote-${quote.number}-${paidNow.id.slice(-6)}`, value: paidNow.amountCents / 100, currency: "USD", payment_type: paidNow.isDeposit ? "deposit" : "payment" }}
        />
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <QuoteDocument quote={quote} state={state} />
        <aside aria-label="Your response" className="lg:sticky lg:top-8 lg:self-start">
          <QuoteActions {...actions} />
        </aside>
      </div>
    </Container>
  );
}

function NoticeBanner({ notice, email, replyWindow }: { notice: Exclude<Notice, null>; email: string; replyWindow: string }) {
  const content = {
    paid: {
      icon: CheckCircle2,
      className: "border-success-700/30 bg-success-100 text-success-700",
      title: "Payment received. Thank you.",
      body: `A receipt is on its way to ${email}. We'll be in touch within ${replyWindow} to confirm your start date.`,
    },
    processing: {
      icon: Clock,
      className: "border-navy-300 bg-white text-navy-950",
      title: "Your payment is processing",
      body: `Some payment methods take a few minutes to confirm. We'll email ${email} as soon as it clears; there's no need to pay again.`,
    },
    canceled: {
      icon: Info,
      className: "border-navy-300 bg-white text-navy-950",
      title: "Checkout canceled",
      body: "Nothing was charged. Your quote is still here whenever you're ready.",
    },
  }[notice];
  const Icon = content.icon;
  return (
    <div role="status" className={`quote-done mb-8 flex gap-3 rounded-panel border p-5 ${content.className}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">{content.title}</p>
        <p className="mt-1 text-navy-700">{content.body}</p>
      </div>
    </div>
  );
}
