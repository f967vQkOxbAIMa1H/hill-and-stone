import "server-only";
import { db } from "@/lib/db";
import { isValidTokenFormat } from "./state";

/** Loads a quote for the public portal. Returns null for malformed tokens, unknown tokens and drafts alike. */
export async function getQuoteByToken(token: string) {
  if (!isValidTokenFormat(token)) return null;
  const quote = await db.quote.findUnique({
    where: { publicToken: token },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      address: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      lead: { select: { number: true, attachments: { where: { kind: "PHOTO" }, orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!quote || quote.status === "DRAFT") return null;
  return quote;
}

export type PortalQuote = NonNullable<Awaited<ReturnType<typeof getQuoteByToken>>>;

/** First view moves SENT to VIEWED and is logged once. Safe to call on every render. */
export async function recordView(quoteId: string, meta: { ipAddress?: string; userAgent?: string }) {
  const updated = await db.quote.updateMany({
    where: { id: quoteId, firstViewedAt: null },
    data: { firstViewedAt: new Date() },
  });
  if (updated.count === 0) return;
  await db.quote.updateMany({ where: { id: quoteId, status: "SENT" }, data: { status: "VIEWED" } });
  await db.quoteEvent.create({ data: { quoteId, type: "VIEWED", ...meta } });
  await db.conversionEvent.create({ data: { name: "quote_viewed", quoteId } });
}
