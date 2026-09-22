import "server-only";
import { formatCents } from "@/lib/money";
import { declineReasons } from "@/lib/quotes/state";
import { site } from "@/lib/site";
import { esc, layout, rows } from "./templates";

type QuoteInfo = {
  number: number;
  title: string;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  address: string;
  url: string;
};

type PaymentInfo = {
  amountCents: number;
  balanceCents: number;
  method: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  receiptUrl: string | null;
  paidAt: Date;
  isDeposit: boolean;
};

const methodLabel = (p: PaymentInfo) =>
  p.cardBrand && p.cardLast4
    ? `${p.cardBrand[0].toUpperCase()}${p.cardBrand.slice(1)} ending ${p.cardLast4}`
    : p.method === "cashapp"
      ? "Cash App Pay"
      : (p.method ?? "Card");

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Chicago" });

export function paymentReceipt(q: QuoteInfo, p: PaymentInfo) {
  const subject = `Payment received for quote #${q.number}`;
  const summary: [string, string][] = [
    ["Quote", `#${q.number}: ${q.title}`],
    ["Amount paid", formatCents(p.amountCents)],
    ["Paid with", methodLabel(p)],
    ["Date", dateFmt.format(p.paidAt)],
    ["Quote total", formatCents(q.totalCents)],
    ["Balance due", p.balanceCents > 0 ? `${formatCents(p.balanceCents)}, due when the work is done` : "Paid in full"],
  ];
  const html = layout(`
<p style="margin:0 0 12px;font-size:22px;font-weight:800">Thanks, ${esc(q.customerName)}. Your payment went through.</p>
<p style="margin:0 0 12px">${
    p.isDeposit
      ? "Your deposit is in and your project is on our schedule. We'll be in touch within one business day to confirm a start date."
      : "Your quote is approved and paid. We'll be in touch within one business day to confirm a start date."
  }</p>
${rows(summary)}
<p style="margin:0 0 12px"><a href="${esc(q.url)}" style="color:#b45309;font-weight:bold">View your quote</a>${
    p.receiptUrl ? ` &nbsp; <a href="${esc(p.receiptUrl)}" style="color:#b45309">Card receipt</a>` : ""
  }</p>
<p style="margin:0">Hill &amp; Stone<br><a href="${site.phoneHref}" style="color:#b45309">${esc(site.phone)}</a></p>`);
  const text = `Thanks, ${q.customerName}. Your payment went through.\n\n${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nView your quote: ${q.url}${p.receiptUrl ? `\nCard receipt: ${p.receiptUrl}` : ""}\n\nHill & Stone, ${site.phone}`;
  return { subject, html, text };
}

export function acceptedNotice(q: QuoteInfo, p: PaymentInfo) {
  const kind = p.isDeposit ? "deposit" : p.balanceCents > 0 ? "payment" : "payment in full";
  const subject = `Quote #${q.number} accepted: ${formatCents(p.amountCents)} ${kind} from ${q.customerName}`;
  const details: [string, string][] = [
    ["Customer", `${q.customerName} (${q.customerEmail})`],
    ["Address", q.address],
    ["Quote", `#${q.number}: ${q.title}`],
    ["Paid now", `${formatCents(p.amountCents)} via ${methodLabel(p)}`],
    ["Quote total", formatCents(q.totalCents)],
    ["Balance due", formatCents(p.balanceCents)],
  ];
  const html = layout(`<p style="margin:0 0 8px;font-size:20px;font-weight:800">Quote #${q.number} accepted</p>${rows(details)}<p style="margin:0"><a href="${esc(q.url)}" style="color:#b45309">Open the quote</a></p>`);
  return { subject, html, text: details.map(([k, v]) => `${k}: ${v}`).join("\n") };
}

export function declinedNotice(q: QuoteInfo, reason: string, note: string | null) {
  const reasonLabel = declineReasons.find((r) => r.value === reason)?.label ?? reason;
  const subject = `Quote #${q.number} declined by ${q.customerName}`;
  const details: [string, string][] = [
    ["Customer", `${q.customerName} (${q.customerEmail})`],
    ["Address", q.address],
    ["Quote", `#${q.number}: ${q.title} (${formatCents(q.totalCents)})`],
    ["Reason", reasonLabel],
    ["Their note", note || "(none)"],
  ];
  const html = layout(`<p style="margin:0 0 8px;font-size:20px;font-weight:800">Quote #${q.number} declined</p>${rows(details)}<p style="margin:0;color:#475569;font-size:14px">Reply to this email to follow up with the customer.</p>`);
  return { subject, html, text: details.map(([k, v]) => `${k}: ${v}`).join("\n") };
}

export function quoteSent(q: QuoteInfo & { validUntil: Date | null; depositCents: number; customerFirstName: string }) {
  const subject = `Your quote from Hill & Stone: ${q.title}`;
  const summary: [string, string][] = [
    ["Quote", `#${q.number}: ${q.title}`],
    ["Address", q.address],
    ["Total", formatCents(q.totalCents)],
    ...(q.depositCents > 0 ? ([["Deposit to start", formatCents(q.depositCents)]] as [string, string][]) : []),
    ...(q.validUntil ? ([["Valid until", dateFmt.format(q.validUntil)]] as [string, string][]) : []),
  ];
  const html = layout(`
<p style="margin:0 0 12px;font-size:22px;font-weight:800">Hi ${esc(q.customerFirstName)}, your quote is ready.</p>
<p style="margin:0 0 12px">It's itemized so you can see exactly what's included. You can accept and pay online, or let us know if it isn't right for you.</p>
${rows(summary)}
<p style="margin:20px 0"><a href="${esc(q.url)}" style="display:inline-block;background:#d97706;color:#0f172a;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:4px">Review your quote</a></p>
<p style="margin:0 0 12px;font-size:14px;color:#475569">This link is private to you. Questions? Reply to this email or call ${esc(site.phone)}.</p>`);
  const text = `Hi ${q.customerFirstName}, your quote is ready.\n\n${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nReview your quote: ${q.url}\n\nQuestions? Reply to this email or call ${site.phone}.`;
  return { subject, html, text };
}
