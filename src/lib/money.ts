// All money is integer cents. Quantities are thousandths (1000 = 1 unit).

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number) {
  return usd.format(cents / 100);
}

export function lineTotalCents(quantityMilli: number, unitPriceCents: number) {
  return Math.round((quantityMilli * unitPriceCents) / 1000);
}

/** Tax and deposit rates are basis points (975 = 9.75%). Discounts are negative line totals. */
export function quoteTotals(
  lines: { quantityMilli: number; unitPriceCents: number }[],
  taxRateBps: number,
  depositBps = 0,
) {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotalCents(l.quantityMilli, l.unitPriceCents), 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  const totalCents = subtotalCents + taxCents;
  const depositCents = Math.round((totalCents * depositBps) / 10_000);
  return { subtotalCents, taxCents, totalCents, depositCents };
}
