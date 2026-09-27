// Quote builder input, shared by the editor (client) and the server actions.
import { z } from "zod";
import { stripTags } from "@/lib/sanitize";
import { LineItemType } from "@/generated/prisma/enums";
import { lineTotalCents, quoteTotals } from "@/lib/money";

const money = z
  .string()
  .trim()
  .transform((v) => v.replace(/[$,\s]/g, ""))
  .pipe(z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Enter an amount like 85 or 85.50."));

const qty = z
  .string()
  .trim()
  .pipe(z.string().regex(/^\d+(\.\d{1,3})?$/, "Enter a quantity like 1, 2.5 or 0.25."))
  .refine((v) => Number(v) > 0, "Quantity must be more than 0.");

export const lineSchema = z.object({
  type: z.enum(LineItemType),
  description: z.string().overwrite(stripTags).trim().min(1, "Describe this line.").max(300),
  quantity: qty,
  unitPrice: money,
});

export const quoteDraftSchema = z
  .object({
    id: z.string().optional(),
    leadId: z.string().min(1),
    title: z.string().overwrite(stripTags).trim().min(3, "Give the quote a short title.").max(120),
    scopeOfWork: z.string().overwrite(stripTags).trim().min(20, "Describe the scope in a sentence or two.").max(5000),
    exclusions: z.string().overwrite(stripTags).trim().max(2000).optional().default(""),
    validDays: z.coerce.number().int().min(1, "At least 1 day.").max(120, "At most 120 days."),
    taxRatePercent: z
      .string()
      .trim()
      .regex(/^\d{1,2}(\.\d{1,3})?$/, "Enter a rate like 9.75.")
      .refine((v) => Number(v) <= 20, "That tax rate looks too high."),
    lines: z.array(lineSchema).min(1, "Add at least one line item.").max(60),
  })
  .superRefine((q, ctx) => {
    if (computeTotals(q).totalCents <= 0) ctx.addIssue({ code: "custom", path: ["lines"], message: "The total must be more than $0." });
  });

export type QuoteDraftInput = z.input<typeof quoteDraftSchema>;
export type QuoteDraft = z.output<typeof quoteDraftSchema>;

export function toCents(dollars: string): number | null {
  const clean = dollars.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** Line items in cents. Discounts are always stored negative, whatever sign was typed. */
export function toLineItems(lines: z.input<typeof lineSchema>[]) {
  return lines.map((l, i) => {
    const quantityMilli = Math.round(Number(l.quantity || 0) * 1000);
    const raw = toCents(l.unitPrice) ?? 0;
    const unitPriceCents = l.type === "DISCOUNT" ? -Math.abs(raw) : raw;
    return {
      type: l.type,
      description: l.description.trim(),
      quantityMilli,
      unitPriceCents,
      totalCents: lineTotalCents(quantityMilli, unitPriceCents),
      sortOrder: i,
    };
  });
}

export const taxBps = (percent: string) => Math.round(Number(percent || 0) * 100);

/**
 * Totals exactly as the server stores them. The editor uses this for its live preview.
 * No deposits: payment is due upon completion, so the whole total is billed when the job is done.
 */
export function computeTotals(q: Pick<QuoteDraftInput, "lines" | "taxRatePercent">) {
  const items = toLineItems(q.lines);
  const { subtotalCents, taxCents, totalCents } = quoteTotals(items, taxBps(q.taxRatePercent), 0);
  return { items, subtotalCents, taxCents, totalCents, depositBps: 0, depositFixedCents: null };
}
