import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon, Search } from "lucide-react";
import { ago, fmtDay } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { PhoneList, PhoneRow } from "@/components/admin/phone-list";
import { StatusTabs } from "@/components/admin/status-tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import type { LeadStatus } from "@/generated/prisma/enums";
import { leadStatus, leadStatusOrder, quoteStatus } from "@/lib/admin/labels";
import { leadStatusCounts, listLeads } from "@/lib/admin/queries";
import { budgetOptions, categoryOptions, labelFor, timelineOptions } from "@/lib/quote-request/options";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage({ searchParams }: PageProps<"/admin/requests">) {
  const sp = await searchParams;
  const status = leadStatusOrder.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [leads, counts] = await Promise.all([listLeads({ status, q }), leadStatusCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <>
      <AdminHeader title="Requests" description="Quote requests from the website, newest first." />
      <div className="px-5 py-6 sm:px-8">
        <form role="search" className="mb-4 flex max-w-md gap-2" action="/admin/requests">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Search requests
          </label>
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-400" />
            <Input id="q" name="q" defaultValue={q} placeholder="Name, email, city or #number" className="pl-9" />
          </div>
        </form>

        <StatusTabs
          base="/admin/requests"
          current={status}
          label="Filter by status"
          extra={q ? `&q=${encodeURIComponent(q)}` : ""}
          tabs={[{ label: "All", count: total }, ...leadStatusOrder.map((s) => ({ value: s, label: leadStatus[s].label, count: counts[s] ?? 0 }))]}
        />

        {leads.length === 0 ? (
          <div className="mt-8 rounded-panel border border-dashed border-navy-300 p-8 text-center">
            <p className="font-semibold">{q ? `No requests match “${q}”.` : "No requests with this status."}</p>
            <p className="mt-1 text-sm text-navy-600">{q ? "Try a name, email, city or request number." : "New website requests start in Pending review."}</p>
          </div>
        ) : (
          <>
          <PhoneList className="mt-4">
            {leads.map((l) => {
              const quote = l.quotes[0];
              return (
                <PhoneRow
                  key={l.id}
                  href={`/admin/requests/${l.id}`}
                  title={`#${l.number} ${l.customer.firstName} ${l.customer.lastName}`}
                  lines={[
                    `${labelFor(categoryOptions, l.category)}, ${l.address.city}`,
                    quote && `Quote ${quoteStatus[quote.status].label.toLowerCase()}, ${formatCents(quote.totalCents)}`,
                  ]}
                  aside={
                    <>
                      <Badge tone={leadStatus[l.status].tone}>{leadStatus[l.status].label}</Badge>
                      <span className="text-navy-600">{ago(l.createdAt)}</span>
                    </>
                  }
                />
              );
            })}
          </PhoneList>
          <div className="mt-4 hidden overflow-x-auto rounded-panel border border-navy-200 bg-white md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Request</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Work</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Timing and budget</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-200">
                {leads.map((l) => {
                  const quote = l.quotes[0];
                  return (
                    <tr key={l.id} className="group relative hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <Link prefetch={false} href={`/admin/requests/${l.id}`} className="font-semibold after:absolute after:inset-0 group-hover:text-copper-700">
                          #{l.number} {l.customer.firstName} {l.customer.lastName}
                        </Link>
                        <span className="block text-navy-600">{l.address.city}</span>
                      </td>
                      <td className="px-4 py-3">
                        {labelFor(categoryOptions, l.category)}
                        {l._count.attachments > 0 && (
                          <span className="mt-0.5 flex items-center gap-1 text-navy-600">
                            <ImageIcon aria-hidden className="size-3.5" />
                            {l._count.attachments} photo{l._count.attachments === 1 ? "" : "s"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-700">
                        {labelFor(timelineOptions, l.timeline)}
                        <span className="block text-navy-600">{labelFor(budgetOptions, l.budgetRange)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={leadStatus[l.status].tone}>{leadStatus[l.status].label}</Badge>
                        {quote && (
                          <span className="mt-1 block text-navy-600">
                            Quote {quoteStatus[quote.status].label.toLowerCase()}, {formatCents(quote.totalCents)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-navy-600">
                        {ago(l.createdAt)}
                        <span className="block">{fmtDay(l.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  );
}
