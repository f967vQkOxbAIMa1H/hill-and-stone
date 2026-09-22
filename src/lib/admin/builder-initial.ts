import "server-only";
import type { QuoteDraftInput } from "@/lib/admin/quote-schema";
import { categoryOptions, labelFor } from "@/lib/quote-request/options";
import { quoteDefaults } from "@/lib/site";
import type { AdminQuote, getLead } from "./queries";

const dollars = (cents: number) => (Math.abs(cents) % 100 === 0 ? String(Math.abs(cents) / 100) : (Math.abs(cents) / 100).toFixed(2));
const qty = (milli: number) => String(milli / 1000);

type Lead = NonNullable<Awaited<ReturnType<typeof getLead>>>;

export function builderLead(lead: Pick<Lead, "id" | "number" | "customer" | "address" | "attachments">) {
  const a = lead.address;
  return {
    id: lead.id,
    number: lead.number,
    name: `${lead.customer.firstName} ${lead.customer.lastName}`,
    email: lead.customer.email,
    address: `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}`,
    photos: lead.attachments.length,
  };
}

export function newQuoteInput(lead: Lead): QuoteDraftInput {
  return {
    leadId: lead.id,
    title: labelFor(categoryOptions, lead.category),
    scopeOfWork: "",
    exclusions: "",
    validDays: quoteDefaults.validDays,
    taxRatePercent: quoteDefaults.taxRatePercent,
    depositMode: "none",
    depositPercent: quoteDefaults.depositPercent,
    depositFixed: "",
    lines: [
      { type: "LABOR", description: "", quantity: "1", unitPrice: "" },
      { type: "MATERIALS", description: "", quantity: "1", unitPrice: "" },
      { type: "TRIP_FEE", description: "Trip fee", quantity: "1", unitPrice: quoteDefaults.tripFee },
    ],
  };
}

export function draftInput(q: AdminQuote): QuoteDraftInput {
  const days = q.validUntil ? Math.max(1, Math.round((q.validUntil.getTime() - Date.now()) / 86_400_000)) : quoteDefaults.validDays;
  return {
    id: q.id,
    leadId: q.leadId ?? "",
    title: q.title,
    scopeOfWork: q.scopeOfWork,
    exclusions: q.exclusions ?? "",
    validDays: days,
    taxRatePercent: String(q.taxRateBps / 100),
    depositMode: q.depositFixedCents != null ? "fixed" : q.depositBps > 0 ? "percent" : "none",
    depositPercent: q.depositBps > 0 ? String(q.depositBps / 100) : quoteDefaults.depositPercent,
    depositFixed: q.depositFixedCents != null ? dollars(q.depositFixedCents) : "",
    lines: q.lineItems.map((l) => ({ type: l.type, description: l.description, quantity: qty(l.quantityMilli), unitPrice: dollars(l.unitPriceCents) })),
  };
}
