import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MessageSquare, Phone, Plus } from "lucide-react";
import { fmtDateTime, fmtDay, phoneFmt } from "@/components/admin/format";
import { LeadStatusSelect, NoteForm } from "@/components/admin/lead-controls";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { leadStatus, quoteStatus } from "@/lib/admin/labels";
import { getLead } from "@/lib/admin/queries";
import { budgetOptions, categoryOptions, contactOptions, labelFor, timelineOptions } from "@/lib/quote-request/options";
import { formatCents } from "@/lib/money";
import { serviceAreas } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/admin/requests/[id]">): Promise<Metadata> {
  const lead = await getLead((await params).id);
  return { title: lead ? `Request #${lead.number}` : "Request" };
}

export default async function RequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  const c = lead.customer;
  const a = lead.address;
  const area = serviceAreas.find((s) => s.slug === a.serviceArea);
  const preferred = labelFor(contactOptions, lead.preferredContact);

  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link href="/admin/requests" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Requests
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-navy-600">
              Request #{lead.number}, received {fmtDateTime(lead.createdAt)}
            </p>
            <h1 className="mt-1 font-semiwide text-2xl font-bold sm:text-3xl">
              {c.firstName} {c.lastName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={leadStatus[lead.status].tone}>{leadStatus[lead.status].label}</Badge>
              <span className="text-navy-600">{labelFor(categoryOptions, lead.category)}</span>
            </div>
          </div>
          <ButtonLink href={`/admin/requests/${lead.id}/quote/new`}>
            <Plus aria-hidden />
            Create quote
          </ButtonLink>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="font-bold">What they need</h2>
            <p className="mt-2 max-w-[70ch] whitespace-pre-line rounded-panel border border-navy-200 bg-white p-5">{lead.description}</p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <Fact term="Type of work">{labelFor(categoryOptions, lead.category)}</Fact>
              <Fact term="Timeline">{labelFor(timelineOptions, lead.timeline)}</Fact>
              <Fact term="Budget">{labelFor(budgetOptions, lead.budgetRange)}</Fact>
            </dl>
          </section>

          <section aria-labelledby="photos-h">
            <h2 id="photos-h" className="font-bold">
              Photos <span className="font-normal text-navy-600">({lead.attachments.length})</span>
            </h2>
            {lead.attachments.length === 0 ? (
              <p className="mt-2 text-sm text-navy-600">No photos attached. Ask for a few before quoting if the job isn&apos;t clear.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                {lead.attachments.map((p, i) => (
                  <li key={p.id}>
                    <a href={`/api/admin/attachments/${p.id}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-panel border border-navy-200 bg-navy-900 ring-copper-500 hover:ring-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- private, session-gated image */}
                      <img src={`/api/admin/attachments/${p.id}`} alt={`Photo ${i + 1} from request #${lead.number}`} className="aspect-[4/3] w-full object-cover" />
                    </a>
                    <p className="mt-1 truncate text-sm text-navy-600" title={p.fileName}>
                      {p.fileName}, {Math.max(1, Math.round(p.sizeBytes / 1024))} KB
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="quotes-h">
            <h2 id="quotes-h" className="font-bold">Quotes</h2>
            {lead.quotes.length === 0 ? (
              <p className="mt-2 text-sm text-navy-600">No quotes yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-navy-200 rounded-panel border border-navy-200 bg-white">
                {lead.quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/admin/quotes/${q.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-stone-50">
                      <span>
                        <span className="font-semibold">#{q.number} {q.title}</span>
                        <span className="block text-sm text-navy-600">{q.sentAt ? `Sent ${fmtDay(q.sentAt)}` : `Created ${fmtDay(q.createdAt)}`}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">{formatCents(q.totalCents)}</span>
                        <Badge tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="notes-h">
            <h2 id="notes-h" className="font-bold">Notes</h2>
            <div className="mt-3 max-w-xl">
              <NoteForm leadId={lead.id} />
            </div>
            {lead.notes.length > 0 && (
              <ul className="mt-4 max-w-xl space-y-3">
                {lead.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-navy-200 pl-3">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="text-sm text-navy-600">
                      {n.author?.name ?? n.author?.email ?? "Admin"}, {fmtDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-panel border border-navy-200 bg-white p-5">
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
          </div>

          <div className="rounded-panel border border-navy-200 bg-white p-5">
            <h2 className="font-bold">Contact</h2>
            <p className="mt-1 text-sm text-navy-600">
              Prefers: <strong className="text-navy-950">{preferred}</strong>
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <a href={`tel:+1${c.phone}`} className="inline-flex items-center gap-2 font-semibold hover:text-copper-700">
                  <Phone aria-hidden className="size-4" />
                  {phoneFmt(c.phone)}
                </a>
              </li>
              <li>
                <a href={`sms:+1${c.phone}`} className="inline-flex items-center gap-2 hover:text-copper-700">
                  <MessageSquare aria-hidden className="size-4" />
                  Text
                </a>
              </li>
              <li>
                <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Your Hill & Stone request #${lead.number}`)}`} className="inline-flex items-center gap-2 break-all hover:text-copper-700">
                  <Mail aria-hidden className="size-4 shrink-0" />
                  {c.email}
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-panel border border-navy-200 bg-white p-5">
            <h2 className="font-bold">Service address</h2>
            <address className="mt-2 not-italic">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.postalCode}
            </address>
            <p className="mt-2 text-sm text-navy-600">{area ? `${area.name} (${area.core ? "primary area" : "also served"})` : "Outside listed service areas"}</p>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(`${a.line1}, ${a.city}, ${a.state} ${a.postalCode}`)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-copper-700 underline-offset-4 hover:underline">
              Open in Maps
            </a>
          </div>

          {(lead.utmSource || lead.referrer || lead.landingPage) && (
            <div className="rounded-panel border border-navy-200 bg-white p-5 text-sm">
              <h2 className="font-bold">Where they came from</h2>
              <dl className="mt-2 space-y-1 text-navy-700">
                {lead.utmSource && <Fact term="Source" inline>{[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ")}</Fact>}
                {lead.referrer && <Fact term="Referrer" inline>{lead.referrer}</Fact>}
                {lead.landingPage && <Fact term="First page" inline>{lead.landingPage}</Fact>}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({ term, children, inline }: { term: string; children: React.ReactNode; inline?: boolean }) {
  return inline ? (
    <div className="flex gap-2">
      <dt className="text-navy-600">{term}:</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  ) : (
    <div>
      <dt className="text-navy-600">{term}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
