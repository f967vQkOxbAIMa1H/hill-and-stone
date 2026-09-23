import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import type { LineItemType } from "@/generated/prisma/enums";
import { formatCents } from "@/lib/money";
import type { PortalQuote } from "@/lib/quotes/queries";
import { depositCents, hasDeposit, type PortalState } from "@/lib/quotes/state";

const groupOrder: LineItemType[] = ["LABOR", "MATERIALS", "TRIP_FEE", "OTHER", "DISCOUNT"];
const groupLabel: Record<LineItemType, string> = {
  LABOR: "Labor",
  MATERIALS: "Materials",
  TRIP_FEE: "Trip fee",
  OTHER: "Other",
  DISCOUNT: "Discounts",
};

export const stateBadge: Record<PortalState, { label: string; tone: "copper" | "success" | "danger" | "neutral" }> = {
  open: { label: "Awaiting your approval", tone: "copper" },
  expired: { label: "Expired", tone: "danger" },
  partially_paid: { label: "Accepted, deposit paid", tone: "success" },
  paid: { label: "Paid in full", tone: "success" },
  declined: { label: "Declined", tone: "neutral" },
  void: { label: "Withdrawn", tone: "neutral" },
  hidden: { label: "Draft", tone: "neutral" },
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
export const formatDate = (d: Date) => dateFmt.format(d);

function formatQty(milli: number) {
  const n = milli / 1000;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

export function QuoteDocument({ quote, state }: { quote: PortalQuote; state: PortalState }) {
  const groups = groupOrder
    .map((type) => ({ type, items: quote.lineItems.filter((l) => l.type === type) }))
    .filter((g) => g.items.length > 0);
  const badge = stateBadge[state];
  const photos = quote.lead?.attachments ?? [];
  const issued = quote.sentAt ?? quote.createdAt;
  const expired = state === "expired";

  return (
    <article aria-labelledby="quote-title" className="rounded-panel border border-navy-200 bg-white">
      {/* Header */}
      <header className="border-b border-navy-200 p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-navy-600">Quote #{quote.number}</p>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <h1 id="quote-title" className="mt-3 max-w-[22ch] font-wide text-3xl font-extrabold tracking-[-0.01em] text-balance sm:text-4xl">
          {quote.title}
        </h1>

        <dl className="mt-8 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2 xl:grid-cols-[1.3fr_1.2fr_1fr_1fr]">
          <div>
            <dt className="text-navy-600">Prepared for</dt>
            <dd className="mt-1 font-semibold">
              {quote.customer.firstName} {quote.customer.lastName}
            </dd>
            <dd className="text-navy-700 [overflow-wrap:anywhere]">{quote.customer.email}</dd>
          </div>
          {quote.address && (
            <div>
              <dt className="text-navy-600">Service address</dt>
              <dd className="mt-1 font-semibold">
                {quote.address.line1}
                {quote.address.line2 ? `, ${quote.address.line2}` : ""}
              </dd>
              <dd className="text-navy-700">
                {quote.address.city}, {quote.address.state} {quote.address.postalCode}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-navy-600">Issued</dt>
            <dd className="mt-1 font-semibold">{formatDate(issued)}</dd>
          </div>
          {quote.validUntil && (
            <div>
              <dt className="text-navy-600">{expired ? "Expired" : "Valid until"}</dt>
              <dd className={expired ? "mt-1 font-semibold text-danger-700" : "mt-1 font-semibold"}>{formatDate(quote.validUntil)}</dd>
            </div>
          )}
        </dl>
      </header>

      {/* Scope */}
      <section aria-labelledby="scope-heading" className="border-b border-navy-200 p-6 sm:p-10">
        <h2 id="scope-heading" className="font-semiwide text-xl font-bold">
          Scope of work
        </h2>
        <p className="mt-3 max-w-[68ch] whitespace-pre-line text-navy-700">{quote.scopeOfWork}</p>
        {quote.exclusions && (
          <div className="mt-6 rounded-control bg-stone-100 p-4">
            <h3 className="text-sm font-semibold">Not included</h3>
            <p className="mt-1 max-w-[68ch] whitespace-pre-line text-sm text-navy-700">{quote.exclusions}</p>
          </div>
        )}
      </section>

      {/* Line items */}
      <section aria-labelledby="items-heading" className="p-6 sm:p-10">
        <h2 id="items-heading" className="font-semiwide text-xl font-bold">
          Price breakdown
        </h2>
        <table className="mt-5 w-full text-left">
          <caption className="sr-only">Itemized price for quote #{quote.number}</caption>
          <thead className="sr-only sm:not-sr-only">
            <tr className="border-b-2 border-navy-950 text-sm">
              <th scope="col" className="pb-2 font-semibold">
                Item
              </th>
              <th scope="col" className="hidden pb-2 text-right font-semibold sm:table-cell">
                Qty
              </th>
              <th scope="col" className="hidden pb-2 text-right font-semibold sm:table-cell">
                Unit price
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.type}>
              <tr>
                <th scope="rowgroup" colSpan={4} className="pt-5 pb-1 text-sm font-semibold text-copper-700">
                  {groupLabel[g.type]}
                </th>
              </tr>
              {g.items.map((item) => (
                <tr key={item.id} className="border-b border-navy-200 align-top">
                  <td className="py-3 pr-4">
                    {item.description}
                    <span className="block text-sm text-navy-600 sm:hidden">
                      {formatQty(item.quantityMilli)} × {formatCents(item.unitPriceCents)}
                    </span>
                  </td>
                  <td className="hidden py-3 text-right text-navy-700 tabular-nums sm:table-cell">{formatQty(item.quantityMilli)}</td>
                  <td className="hidden py-3 pl-4 text-right text-navy-700 tabular-nums sm:table-cell">{formatCents(item.unitPriceCents)}</td>
                  <td className="py-3 pl-4 text-right font-medium tabular-nums">{formatCents(item.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>

        <dl className="mt-6 ml-auto max-w-sm space-y-2 tabular-nums">
          <div className="flex justify-between gap-6 text-navy-700">
            <dt>Subtotal</dt>
            <dd>{formatCents(quote.subtotalCents)}</dd>
          </div>
          {quote.taxCents > 0 && (
            <div className="flex justify-between gap-6 text-navy-700">
              <dt>Sales tax ({(quote.taxRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}%)</dt>
              <dd>{formatCents(quote.taxCents)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-6 border-t-2 border-navy-950 pt-3">
            <dt className="font-bold">Total</dt>
            <dd className="font-wide text-2xl font-extrabold">{formatCents(quote.totalCents)}</dd>
          </div>
          {hasDeposit(quote) && (
            <div className="flex justify-between gap-6 text-sm text-navy-600">
              <dt>Deposit to start{quote.depositFixedCents == null ? ` (${quote.depositBps / 100}%)` : ""}</dt>
              <dd>{formatCents(depositCents(quote))}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Photos from the request */}
      {photos.length > 0 && (
        <section aria-labelledby="photos-heading" className="border-t border-navy-200 p-6 sm:p-10">
          <h2 id="photos-heading" className="font-semiwide text-xl font-bold">
            Photos you sent
          </h2>
          <p className="mt-1 text-sm text-navy-600">From your request #{quote.lead?.number}. We priced the work from these.</p>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((p, i) => (
              <li key={p.id}>
                <a
                  href={`/api/quotes/${quote.publicToken}/photos/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-control ring-copper-500 hover:ring-2"
                >
                  <SafeImage
                    src={`/api/quotes/${quote.publicToken}/photos/${p.id}`}
                    alt={`Photo ${i + 1} from your request`}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
