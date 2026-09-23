import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fmtDateTime, fmtDay } from "@/components/admin/format";
import { QuoteActionsBar } from "@/components/admin/quote-actions-bar";
import { QuoteBuilder } from "@/components/admin/quote-builder";
import { Badge } from "@/components/ui/badge";
import { builderLead, draftInput } from "@/lib/admin/builder-initial";
import { eventLabel, quoteStatus } from "@/lib/admin/labels";
import { getLead, getQuoteForAdmin, type AdminQuote } from "@/lib/admin/queries";
import { env } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { balanceCents, depositCents, hasDeposit, paidCents, portalState } from "@/lib/quotes/state";
import { declineReasons } from "@/lib/quotes/state";

export async function generateMetadata({ params }: PageProps<"/admin/quotes/[id]">): Promise<Metadata> {
  const q = await getQuoteForAdmin((await params).id);
  return { title: q ? `Quote #${q.number}` : "Quote" };
}

const typeLabel = { LABOR: "Labor", MATERIALS: "Materials", TRIP_FEE: "Trip fee", OTHER: "Other", DISCOUNT: "Discount" } as const;

export default async function QuotePage({ params, searchParams }: PageProps<"/admin/quotes/[id]">) {
  const quote = await getQuoteForAdmin((await params).id);
  if (!quote) notFound();
  const { sent } = await searchParams;

  const back = quote.lead ? (
    <Link prefetch={false} href={`/admin/requests/${quote.lead.id}`} className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
      <ChevronLeft aria-hidden className="size-4" />
      Request #{quote.lead.number}
    </Link>
  ) : (
    <Link prefetch={false} href="/admin/quotes" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
      <ChevronLeft aria-hidden className="size-4" />
      Quotes
    </Link>
  );

  // Drafts open in the builder.
  if (quote.status === "DRAFT") {
    const lead = quote.lead ? await getLead(quote.lead.id) : null;
    if (!lead) notFound();
    return (
      <>
        <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
          {back}
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-semiwide text-2xl font-bold sm:text-3xl">Quote #{quote.number}</h1>
            <Badge>Draft</Badge>
          </div>
        </header>
        <QuoteBuilder lead={builderLead(lead)} initial={draftInput(quote)} />
      </>
    );
  }

  const state = portalState(quote);
  const url = `${env.NEXT_PUBLIC_APP_URL}/quote/${quote.publicToken}`;
  const expiredWhileOpen = state === "expired" && ["SENT", "VIEWED"].includes(quote.status);

  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        {back}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-semiwide text-2xl font-bold sm:text-3xl">
            Quote #{quote.number}: {quote.title}
          </h1>
          <Badge tone={expiredWhileOpen ? "danger" : quoteStatus[quote.status].tone}>{expiredWhileOpen ? "Expired" : quoteStatus[quote.status].label}</Badge>
        </div>
        <p className="mt-1 text-navy-600">
          {quote.customer.firstName} {quote.customer.lastName}, {quote.customer.email}
          {quote.sentAt ? `. Sent ${fmtDay(quote.sentAt)}` : ""}
          {quote.validUntil ? `, valid until ${fmtDay(quote.validUntil)}` : ""}.
        </p>
        {sent && (
          <p role="status" className={sent === "emailed" ? "mt-4 rounded-control bg-success-100 px-4 py-3 font-medium text-success-700" : "mt-4 rounded-control bg-copper-100 px-4 py-3 font-medium text-copper-700"}>
            {sent === "emailed"
              ? `Quote sent. ${quote.customer.firstName} will get an email with the link.`
              : "Quote is live, but the email didn't send (email isn't configured). Copy the link below and send it yourself."}
          </p>
        )}
        <div className="mt-4">
          <QuoteActionsBar
            quoteId={quote.id}
            url={quote.status === "VOID" ? null : url}
            canResend={state === "open"}
            canVoid={!["ACCEPTED", "PAID", "VOID"].includes(quote.status)}
          />
        </div>
      </header>

      <div className="grid gap-8 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="lines-h">
            <h2 id="lines-h" className="font-bold">Price breakdown</h2>
            <div className="mt-3 overflow-x-auto rounded-panel border border-navy-200 bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Description</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Qty</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Unit</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-200 tabular-nums">
                  {quote.lineItems.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2 text-navy-600">{typeLabel[l.type]}</td>
                      <td className="px-4 py-2">{l.description}</td>
                      <td className="px-4 py-2 text-right">{l.quantityMilli / 1000}</td>
                      <td className="px-4 py-2 text-right">{formatCents(l.unitPriceCents)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCents(l.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-navy-950 tabular-nums">
                  <tr><td colSpan={4} className="px-4 pt-3 text-right text-navy-600">Subtotal</td><td className="px-4 pt-3 text-right">{formatCents(quote.subtotalCents)}</td></tr>
                  <tr><td colSpan={4} className="px-4 text-right text-navy-600">Tax ({quote.taxRateBps / 100}%)</td><td className="px-4 text-right">{formatCents(quote.taxCents)}</td></tr>
                  <tr><td colSpan={4} className="px-4 py-2 text-right font-bold">Total</td><td className="px-4 py-2 text-right font-wide text-lg font-extrabold">{formatCents(quote.totalCents)}</td></tr>
                  {hasDeposit(quote) && <tr><td colSpan={4} className="px-4 pb-3 text-right text-navy-600">Deposit to start</td><td className="px-4 pb-3 text-right">{formatCents(depositCents(quote))}</td></tr>}
                </tfoot>
              </table>
            </div>
          </section>

          <section aria-labelledby="scope-h">
            <h2 id="scope-h" className="font-bold">Scope of work</h2>
            <p className="mt-2 max-w-[70ch] whitespace-pre-line">{quote.scopeOfWork}</p>
            {quote.exclusions && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Not included</h3>
                <p className="mt-1 max-w-[70ch] whitespace-pre-line text-navy-700">{quote.exclusions}</p>
              </>
            )}
          </section>

          {quote.declineReason && (
            <section aria-labelledby="decl-h" className="rounded-panel border border-danger-700/30 bg-danger-100 p-5">
              <h2 id="decl-h" className="font-bold text-danger-700">Declined by client</h2>
              <p className="mt-1">{declineReasons.find((r) => r.value === quote.declineReason)?.label ?? quote.declineReason}</p>
              {quote.declineNote && <p className="mt-2 text-navy-700">&ldquo;{quote.declineNote}&rdquo;</p>}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Money quote={quote} />
          <Timeline quote={quote} />
        </aside>
      </div>
    </>
  );
}

function Money({ quote }: { quote: AdminQuote }) {
  const paid = quote.payments.filter((p) => p.status === "SUCCEEDED");
  return (
    <section aria-labelledby="money-h" className="rounded-panel border border-navy-200 bg-white p-5">
      <h2 id="money-h" className="font-bold">Payments</h2>
      <dl className="mt-3 space-y-1.5 tabular-nums">
        <div className="flex justify-between"><dt className="text-navy-600">Collected</dt><dd className="font-semibold text-success-700">{formatCents(paidCents(quote))}</dd></div>
        <div className="flex justify-between"><dt className="text-navy-600">Balance</dt><dd className="font-semibold">{formatCents(balanceCents(quote))}</dd></div>
      </dl>
      {paid.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-navy-200 pt-3 text-sm">
          {paid.map((p) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span className="text-navy-700">
                {p.paidAt ? fmtDay(p.paidAt) : ""}, {p.isDeposit ? "deposit" : "payment"}
                {p.cardBrand ? ` (${p.cardBrand} ${p.cardLast4})` : p.method ? ` (${p.method})` : ""}
              </span>
              <span className="font-semibold tabular-nums">{formatCents(p.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Quote events and emails, merged into one chronological history. */
function Timeline({ quote }: { quote: AdminQuote }) {
  const items = [
    ...quote.events.map((e) => {
      const meta = (e.metadata ?? {}) as { amountCents?: number; paymentId?: string; resend?: boolean; reason?: string; to?: string };
      let label = eventLabel[e.type];
      if (e.type === "PAID" && meta.amountCents) {
        const payment = quote.payments.find((p) => p.id === meta.paymentId);
        label = `${payment?.isDeposit ? "Deposit paid" : "Payment received"}: ${formatCents(meta.amountCents)}`;
      }
      if (e.type === "SENT" && meta.resend) label = "Email sent again";
      if (e.type === "DECLINED" && meta.reason) label = `Declined by client (${declineReasons.find((r) => r.value === meta.reason)?.label.toLowerCase() ?? meta.reason})`;
      return { at: e.createdAt, label, tone: e.type === "PAID" || e.type === "ACCEPTED" ? "good" : e.type === "DECLINED" || e.type === "VOIDED" || e.type === "PAYMENT_FAILED" ? "bad" : "plain", id: e.id };
    }),
    ...quote.emails.map((m) => ({
      at: m.createdAt,
      label: `Email to ${m.to}: ${m.status === "SENT" || m.status === "DELIVERED" ? "sent" : "not sent"}`,
      tone: m.status === "FAILED" ? "bad" : "muted",
      id: m.id,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <section aria-labelledby="log-h" className="rounded-panel border border-navy-200 bg-white p-5">
      <h2 id="log-h" className="font-bold">History</h2>
      <ol className="mt-4 space-y-4 border-l-2 border-navy-200 pl-4">
        {items.map((i) => (
          <li key={i.id} className="relative">
            <span
              aria-hidden
              className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-white ${i.tone === "good" ? "bg-success-700" : i.tone === "bad" ? "bg-danger-700" : i.tone === "muted" ? "bg-navy-300" : "bg-navy-950"}`}
            />
            <p className={i.tone === "muted" ? "text-sm text-navy-600" : "text-sm font-semibold"}>{i.label}</p>
            <p className="text-sm text-navy-600">{fmtDateTime(i.at)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
