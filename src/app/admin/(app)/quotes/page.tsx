import type { Metadata } from "next";
import Link from "next/link";
import { fmtDay } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { StatusTabs } from "@/components/admin/status-tabs";
import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { quoteStatus, quoteStatusOrder } from "@/lib/admin/labels";
import { listQuotes, quoteStatusCounts } from "@/lib/admin/queries";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage({ searchParams }: PageProps<"/admin/quotes">) {
  const sp = await searchParams;
  const status = quoteStatusOrder.includes(sp.status as QuoteStatus) ? (sp.status as QuoteStatus) : undefined;
  const [quotes, counts] = await Promise.all([listQuotes({ status }), quoteStatusCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <>
      <AdminHeader title="Quotes" description="Create quotes from a request. Sent quotes are locked; void and re-quote to change one." />
      <div className="px-5 py-6 sm:px-8">
        <StatusTabs
          base="/admin/quotes"
          current={status}
          label="Filter by status"
          tabs={[{ label: "All", count: total }, ...quoteStatusOrder.map((s) => ({ value: s, label: quoteStatus[s].label, count: counts[s] ?? 0 }))]}
        />
        {quotes.length === 0 ? (
          <div className="mt-8 rounded-panel border border-dashed border-navy-300 p-8 text-center">
            <p className="font-semibold">No quotes with this status.</p>
            <p className="mt-1 text-sm text-navy-600">
              Open a <Link prefetch={false} href="/admin/requests" className="font-semibold text-copper-700 underline underline-offset-4">request</Link> and choose Create quote.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-panel border border-navy-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quote</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Collected</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200 tabular-nums">
                {quotes.map((q) => (
                  <tr key={q.id} className="group relative hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link prefetch={false} href={`/admin/quotes/${q.id}`} className="font-semibold after:absolute after:inset-0 group-hover:text-copper-700">
                        #{q.number} {q.title}
                      </Link>
                      {q.lead && <span className="block text-navy-600">Request #{q.lead.number}</span>}
                    </td>
                    <td className="px-4 py-3">{q.customer.firstName} {q.customer.lastName}</td>
                    <td className="px-4 py-3"><Badge tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCents(q.totalCents)}</td>
                    <td className="px-4 py-3 text-right text-success-700">{formatCents(q.payments.reduce((s, p) => s + p.amountCents, 0))}</td>
                    <td className="px-4 py-3 text-right text-navy-600">{fmtDay(q.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
