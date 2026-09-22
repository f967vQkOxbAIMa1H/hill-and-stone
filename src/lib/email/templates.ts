import "server-only";
import { formatDay } from "@/lib/dates";
import { budgetOptions, categoryOptions, contactOptions, labelFor, timelineOptions } from "@/lib/quote-request/options";
import type { QuoteRequest } from "@/lib/quote-request/schema";
import { site } from "@/lib/site";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const phoneFmt = (d: string) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;

export function layout(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0f172a;padding:20px 28px;color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:-0.3px">Hill &amp; Stone</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569">${esc(site.legalName)}<br>${esc(site.phone)}<br>${esc(site.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function rows(pairs: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e2e8f0">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #e2e8f0;color:#475569;font-size:14px;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;white-space:pre-wrap">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

type LeadInfo = { number: number; replyBy: Date; photoCount: number };

export function customerConfirmation(req: QuoteRequest, lead: LeadInfo) {
  const subject = `We got your request (#${lead.number})`;
  const summary: [string, string][] = [
    ["Request number", `#${lead.number}`],
    ["Type of work", labelFor(categoryOptions, req.category)],
    ["Address", `${req.line1}${req.line2 ? `, ${req.line2}` : ""}, ${req.city}, AR ${req.postalCode}`],
    ["Timeline", labelFor(timelineOptions, req.timeline)],
    ["Photos", lead.photoCount ? `${lead.photoCount} attached` : "None"],
  ];
  const contact = labelFor(contactOptions, req.preferredContact).replace(" me", "").toLowerCase();
  const html = layout(`
<p style="margin:0 0 12px;font-size:22px;font-weight:800">Thanks, ${esc(req.firstName)}. Your request is in.</p>
<p style="margin:0 0 12px">We'll review your project and ${esc(contact)} you by <strong>${esc(formatDay(lead.replyBy))}</strong> with next steps. Small jobs often get a price right away; larger ones may need a quick site visit.</p>
${rows(summary)}
<p style="margin:0 0 12px">Need to add something, like more photos? Reply to this email and it comes straight to us.</p>
<p style="margin:0">Hill &amp; Stone<br><a href="${site.phoneHref}" style="color:#b45309">${esc(site.phone)}</a></p>`);
  const text = `Thanks, ${req.firstName}. Your request is in.

We'll review your project and ${contact} you by ${formatDay(lead.replyBy)} with next steps.

${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}

Need to add something? Reply to this email.
Hill & Stone, ${site.phone}`;
  return { subject, html, text };
}

export function contractorNotification(req: QuoteRequest, lead: LeadInfo & { serviceArea: string | null }) {
  const subject = `New quote request #${lead.number}: ${labelFor(categoryOptions, req.category)} in ${req.city}`;
  const details: [string, string][] = [
    ["Name", `${req.firstName} ${req.lastName}`],
    ["Phone", phoneFmt(req.phone)],
    ["Email", req.email],
    ["Prefers", labelFor(contactOptions, req.preferredContact)],
    ["Address", `${req.line1}${req.line2 ? `, ${req.line2}` : ""}, ${req.city}, AR ${req.postalCode}`],
    ["Service area", lead.serviceArea ?? "Outside listed areas"],
    ["Type of work", labelFor(categoryOptions, req.category)],
    ["Timeline", labelFor(timelineOptions, req.timeline)],
    ["Budget", labelFor(budgetOptions, req.budgetRange)],
    ["Photos", String(lead.photoCount)],
    ["Description", req.description],
  ];
  const html = layout(`<p style="margin:0 0 8px;font-size:20px;font-weight:800">New quote request #${lead.number}</p>${rows(details)}<p style="margin:0;color:#475569;font-size:14px">Reply to this email to answer the customer directly.</p>`);
  const text = details.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject, html, text };
}
