import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { ago, fmtDay } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { quoteStatus } from "@/lib/admin/labels";
import { getMetrics, recentActivity } from "@/lib/admin/queries";
import { can } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { categoryOptions, labelFor } from "@/lib/quote-request/options";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: PageProps<"/admin">) {
  const me = await requireAdmin();
  const { denied, welcome } = await searchParams;
  const financials = can(me.role, "viewFinancials");
  const [m, [pending, awaiting, payments]] = await Promise.all([getMetrics(), recentActivity()]);
  const rate = m.acceptanceRate === null ? "–" : `${Math.round(m.acceptanceRate * 100)}%`;

  const metrics = [
    {
      label: "Incoming requests",
      value: String(m.leadsTotal),
      detail: `${m.leads30} in the last 30 days`,
      href: "/admin/requests",
    },
    {
      label: "Quote acceptance",
      value: rate,
      detail: m.sent ? `${m.accepted} of ${m.sent} sent quotes accepted` : "No quotes sent yet",
      href: "/admin/quotes",
    },
    ...(financials
      ? [
          {
            label: "Revenue collected",
            value: formatCents(m.revenueCents),
            detail: `${formatCents(m.revenue30Cents)} in the last 30 days`,
            href: "/admin/quotes?status=PAID",
          },
        ]
      : []),
    {
      label: "Awaiting client response",
      value: String(m.awaitingCount),
      detail: `${formatCents(m.awaitingValueCents)} in open quotes`,
      href: "/admin/quotes?status=SENT",
    },
  ];

  return (
    <>
      <AdminHeader
        title="Overview"
        description={
          m.pendingReview
            ? `${m.pendingReview} request${m.pendingReview === 1 ? "" : "s"} waiting for review.`
            : "No requests waiting for review."
        }
      />
      <div className="px-5 py-6 sm:px-8">
        {denied && (
          <p role="status" className="mb-6 rounded-control bg-copper-100 px-4 py-3 font-medium text-copper-700">
            Your role doesn&apos;t include that page. Ask an owner if you need access.
          </p>
        )}
        {welcome && (
          <p role="status" className="mb-6 rounded-control bg-success-100 px-4 py-3 font-medium text-success-700">
            Password set. Welcome aboard.
          </p>
        )}
        {/* One ruled strip rather than four floating cards. */}
        <dl
          className={`grid overflow-hidden rounded-panel border border-navy-200 bg-navy-200 sm:grid-cols-2 [&>*]:bg-white ${financials ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
          style={{ gap: 1 }}
        >
          {metrics.map((x) => (
            <Link prefetch={false} key={x.label} href={x.href} className="group p-5 hover:bg-stone-50">
              <dt className="text-sm text-navy-600 group-hover:text-navy-950">{x.label}</dt>
              <dd className="mt-2 font-semiwide text-3xl font-extrabold tracking-[-0.01em] tabular-nums">{x.value}</dd>
              <dd className="mt-1 text-sm text-navy-600">{x.detail}</dd>
            </Link>
          ))}
        </dl>

        <div className={`mt-8 grid gap-8 ${financials ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
          <Panel
            title="Waiting for review"
            href="/admin/requests?status=PENDING_REVIEW"
            empty="Nothing waiting. New requests land here."
          >
            {pending.map((l) => (
              <Row key={l.id} href={`/admin/requests/${l.id}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    #{l.number} {l.customer.firstName} {l.customer.lastName}
                  </span>
                  <span className="block truncate text-sm text-navy-600">
                    {labelFor(categoryOptions, l.category)}, {l.address.city}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm text-navy-600">
                  {ago(l.createdAt)}
                  {l._count.attachments > 0 && (
                    <span className="flex items-center justify-end gap-1">
                      <ImageIcon aria-hidden className="size-3.5" />
                      {l._count.attachments}
                      <span className="sr-only">photos</span>
                    </span>
                  )}
                </span>
              </Row>
            ))}
          </Panel>

          <Panel title="Awaiting client response" href="/admin/quotes?status=SENT" empty="No quotes out right now.">
            {awaiting.map((q) => (
              <Row key={q.id} href={`/admin/quotes/${q.id}`}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    #{q.number} {q.customer.firstName} {q.customer.lastName}
                  </span>
                  <span className="block truncate text-sm text-navy-600">
                    Sent {q.sentAt ? ago(q.sentAt) : ""}
                    {q.validUntil ? `, valid until ${fmtDay(q.validUntil)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">{formatCents(q.totalCents)}</span>
                  <Badge tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Badge>
                </span>
              </Row>
            ))}
          </Panel>

          {financials && (
            <Panel
              title="Recent payments"
              href="/admin/quotes?status=PAID"
              empty="Payments show up here when clients pay."
            >
              {payments.map((p) => (
                <Row key={p.id} href={`/admin/quotes/${p.quote.id}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {p.quote.customer.firstName} {p.quote.customer.lastName}
                    </span>
                    <span className="block truncate text-sm text-navy-600">
                      Quote #{p.quote.number}, {p.isDeposit ? "deposit" : "payment"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold text-success-700 tabular-nums">
                      {formatCents(p.amountCents)}
                    </span>
                    <span className="block text-sm text-navy-600">{p.paidAt ? ago(p.paidAt) : ""}</span>
                  </span>
                </Row>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Panel({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section aria-labelledby={title} className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={title} className="font-bold">
          {title}
        </h2>
        <Link
          prefetch={false}
          href={href}
          className="text-sm font-semibold text-copper-700 underline-offset-4 hover:underline"
        >
          See all
        </Link>
      </div>
      {children.length ? (
        <ul className="mt-3 divide-y divide-navy-200 rounded-panel border border-navy-200 bg-white">{children}</ul>
      ) : (
        <p className="mt-3 rounded-panel border border-dashed border-navy-300 p-5 text-sm text-navy-600">{empty}</p>
      )}
    </section>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link prefetch={false} href={href} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-stone-50">
        {children}
      </Link>
    </li>
  );
}
