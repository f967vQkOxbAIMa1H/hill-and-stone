// Creates sample quotes in every portal state and prints their links. Development only.
// Usage: npx tsx scripts/sample-quotes.ts [--json]
import { config } from "dotenv";
config({ quiet: true });
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type LineItemType, type QuoteStatus } from "../src/generated/prisma/client";
import { lineTotalCents, quoteTotals } from "../src/lib/money";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DAY = 86_400_000;

type Line = { type: LineItemType; description: string; quantityMilli: number; unitPriceCents: number };

const lines: Line[] = [
  { type: "LABOR", description: "Remove rotted brickmould and casing, prep opening", quantityMilli: 3000, unitPriceCents: 8500 },
  { type: "LABOR", description: "Install PVC brickmould, caulk and paint", quantityMilli: 4500, unitPriceCents: 8500 },
  { type: "MATERIALS", description: "PVC brickmould, 3 pieces", quantityMilli: 3000, unitPriceCents: 4200 },
  { type: "MATERIALS", description: "Sealant, filler and exterior paint", quantityMilli: 1000, unitPriceCents: 6800 },
  { type: "TRIP_FEE", description: "Trip fee", quantityMilli: 1000, unitPriceCents: 7500 },
];

// Payment is due upon completion: quotes are accepted for free, then billed once the job is marked complete.
// "legacy-deposit" is an older quote that took a 50% deposit, kept to check it can still pay its balance.
type Spec = {
  key: string;
  status: QuoteStatus;
  depositBps: number;
  validDays: number;
  accepted?: boolean;
  paymentRequested?: boolean;
  paid?: ("deposit" | "full")[];
  declined?: boolean;
};

const specs: Spec[] = [
  { key: "open", status: "SENT", depositBps: 0, validDays: 30 },
  { key: "open-full", status: "SENT", depositBps: 0, validDays: 30 },
  { key: "expired", status: "VIEWED", depositBps: 0, validDays: -3 },
  { key: "accepted", status: "ACCEPTED", depositBps: 0, validDays: 30, accepted: true },
  { key: "payment-due", status: "ACCEPTED", depositBps: 0, validDays: 30, accepted: true, paymentRequested: true },
  { key: "legacy-deposit", status: "ACCEPTED", depositBps: 5000, validDays: 30, accepted: true, paid: ["deposit"] },
  { key: "paid", status: "PAID", depositBps: 0, validDays: 30, accepted: true, paymentRequested: true, paid: ["full"] },
  { key: "declined", status: "DECLINED", depositBps: 0, validDays: 30, declined: true },
  { key: "void", status: "VOID", depositBps: 0, validDays: 30 },
];

async function main() {
  const json = process.argv.includes("--json");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Attach quotes to the most recent lead that has photos, else create a sample customer.
  const lead = await db.lead.findFirst({ where: { attachments: { some: {} } }, orderBy: { createdAt: "desc" } });
  const customer = lead
    ? await db.customer.findUniqueOrThrow({ where: { id: lead.customerId } })
    : await db.customer.upsert({
        where: { email: "sample.customer@example.com" },
        update: {},
        create: { firstName: "Sample", lastName: "Customer", email: "sample.customer@example.com", phone: "4795550100" },
      });
  const address =
    (lead && (await db.address.findUnique({ where: { id: lead.addressId } }))) ??
    (await db.address.create({ data: { customerId: customer.id, line1: "212 W Central Ave", city: "Bentonville", postalCode: "72712", serviceArea: "bentonville" } }));

  const items = lines.map((l, i) => ({ ...l, totalCents: lineTotalCents(l.quantityMilli, l.unitPriceCents), sortOrder: i }));
  const out: Record<string, string> = {};

  for (const spec of specs) {
    const totals = quoteTotals(lines, 975, spec.depositBps);
    const now = Date.now();
    const token = randomBytes(32).toString("base64url");
    const quote = await db.quote.create({
      data: {
        publicToken: token,
        leadId: lead?.id,
        customerId: customer.id,
        addressId: address.id,
        title: "Front door trim replacement",
        scopeOfWork:
          "Remove the rotted brickmould and lower casing on the front door. Check the sill and framing for soft wood and treat what's sound. Install PVC brickmould that won't rot, seal all joints, and paint to match the existing trim.",
        exclusions: "Replacing the door slab or sill. If the framing behind the trim is rotted, we'll stop and send a revised quote before continuing.",
        status: spec.status,
        subtotalCents: totals.subtotalCents,
        taxRateBps: 975,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        depositBps: spec.depositBps,
        validUntil: new Date(now + spec.validDays * DAY),
        sentAt: new Date(now - 2 * DAY),
        acceptedAt: spec.accepted ? new Date(now - 2 * DAY) : null,
        paymentRequestedAt: spec.paymentRequested ? new Date(now - DAY) : null,
        declinedAt: spec.declined ? new Date(now - DAY) : null,
        declineReason: spec.declined ? "POSTPONED" : null,
        lineItems: { create: items },
        payments: spec.paid
          ? {
              create: spec.paid.map((kind) => ({
                amountCents: kind === "deposit" ? totals.depositCents : totals.totalCents,
                status: "SUCCEEDED" as const,
                isDeposit: kind === "deposit",
                method: "card",
                cardBrand: "visa",
                cardLast4: "4242",
                paidAt: new Date(now - DAY),
              })),
            }
          : undefined,
        events: { create: [{ type: "CREATED" }, { type: "SENT" }] },
      },
    });
    out[spec.key] = `${base}/quote/${quote.publicToken}`;
  }

  if (json) console.log(JSON.stringify(out));
  else for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(14)} ${v}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
