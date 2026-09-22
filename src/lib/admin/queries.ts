import "server-only";
import type { LeadStatus, Prisma, QuoteStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const DAY = 86_400_000;

export async function getMetrics() {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * DAY);
  const openWhere: Prisma.QuoteWhereInput = {
    status: { in: ["SENT", "VIEWED"] },
    OR: [{ validUntil: null }, { validUntil: { gte: now } }],
  };

  const [leadsTotal, leads30, pendingReview, quoteCounts, revenue, revenue30, awaiting] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { createdAt: { gte: since } } }),
    db.lead.count({ where: { status: "PENDING_REVIEW" } }),
    db.quote.groupBy({ by: ["status"], _count: { _all: true } }),
    db.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    db.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: since } }, _sum: { amountCents: true } }),
    db.quote.aggregate({ where: openWhere, _count: { _all: true }, _sum: { totalCents: true } }),
  ]);

  const count = (s: QuoteStatus[]) => quoteCounts.filter((q) => s.includes(q.status)).reduce((n, q) => n + q._count._all, 0);
  const accepted = count(["ACCEPTED", "PAID"]);
  // Every quote a client has received, whatever happened next. Drafts and voided quotes don't count.
  const sent = count(["SENT", "VIEWED", "ACCEPTED", "PAID", "DECLINED", "EXPIRED"]);

  return {
    leadsTotal,
    leads30,
    pendingReview,
    accepted,
    sent,
    acceptanceRate: sent ? accepted / sent : null,
    revenueCents: revenue._sum.amountCents ?? 0,
    revenue30Cents: revenue30._sum.amountCents ?? 0,
    awaitingCount: awaiting._count._all,
    awaitingValueCents: awaiting._sum.totalCents ?? 0,
  };
}

export function listLeads({ status, q }: { status?: LeadStatus; q?: string }) {
  const search = q?.trim();
  const number = search && /^#?\d+$/.test(search) ? Number(search.replace("#", "")) : undefined;
  return db.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              ...(number ? [{ number }] : []),
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } },
              { address: { city: { contains: search, mode: "insensitive" } } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      address: { select: { city: true, serviceArea: true } },
      _count: { select: { attachments: true } },
      quotes: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, totalCents: true } },
    },
  });
}

export async function leadStatusCounts() {
  const rows = await db.lead.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<LeadStatus, number>>;
}

export function getLead(id: string) {
  return db.lead.findUnique({
    where: { id },
    include: {
      customer: true,
      address: true,
      attachments: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, email: true } } } },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, title: true, status: true, totalCents: true, sentAt: true, createdAt: true },
      },
    },
  });
}

export function listQuotes({ status }: { status?: QuoteStatus }) {
  return db.quote.findMany({
    where: status ? { status } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      lead: { select: { number: true } },
      payments: { where: { status: "SUCCEEDED" }, select: { amountCents: true } },
    },
  });
}

export async function quoteStatusCounts() {
  const rows = await db.quote.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<QuoteStatus, number>>;
}

export function getQuoteForAdmin(id: string) {
  return db.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      address: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      emails: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      lead: { select: { id: true, number: true, category: true } },
    },
  });
}

export type AdminQuote = NonNullable<Awaited<ReturnType<typeof getQuoteForAdmin>>>;

export function recentActivity() {
  const now = new Date();
  return Promise.all([
    db.lead.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      take: 6,
      include: { customer: { select: { firstName: true, lastName: true } }, address: { select: { city: true } }, _count: { select: { attachments: true } } },
    }),
    db.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED"] }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { sentAt: "asc" },
      take: 6,
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    db.payment.findMany({
      where: { status: "SUCCEEDED" },
      orderBy: { paidAt: "desc" },
      take: 6,
      include: { quote: { select: { id: true, number: true, customer: { select: { firstName: true, lastName: true } } } } },
    }),
  ]);
}
