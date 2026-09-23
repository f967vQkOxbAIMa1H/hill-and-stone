"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LeadStatus } from "@/generated/prisma/enums";
import { quoteDraftSchema, computeTotals, type QuoteDraftInput } from "@/lib/admin/quote-schema";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, requireCan } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { balanceRequest, quoteSent } from "@/lib/email/quote-templates";
import { env } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { balanceCents, depositCents, paidCents, portalState } from "@/lib/quotes/state";
import { getSite } from "@/lib/settings";
import { getStripe } from "@/lib/stripe";

// Every action re-checks the session: a page-level check doesn't protect a server action.

// ─── Auth ───────────────────────────────────────────────────────────────────

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const ip = clientIp(await headers());

  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000) || !rateLimit(`login:${email}`, 5, 15 * 60_000)) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again.", email };
  }
  if (!email || !password) return { error: "Enter your email and password.", email };

  const user = await db.user.findUnique({ where: { email } });
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
  // Same message for every failure, so it doesn't reveal which accounts exist or are deactivated.
  if (!user || !ok || user.role === "CUSTOMER" || user.deactivatedAt) {
    return { error: "That email and password don't match. Check both and try again.", email };
  }

  await createSession(user.id);
  // Only follow same-site admin paths after sign-in.
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ─── Leads ──────────────────────────────────────────────────────────────────

export async function updateLeadStatus(leadId: string, status: string) {
  await requireCan("workRequests");
  const parsed = z.enum(LeadStatus).safeParse(status);
  if (!parsed.success) return { error: "Choose a status from the list." };
  await db.lead.update({
    where: { id: leadId },
    data: { status: parsed.data, ...(parsed.data === "CONTACTED" ? { contactedAt: new Date() } : {}) },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function addLeadNote(leadId: string, body: string) {
  const admin = await requireCan("workRequests");
  const text = body.trim();
  if (!text) return { error: "Write a note first." };
  if (text.length > 2000) return { error: "Keep notes under 2,000 characters." };
  await db.leadNote.create({ data: { leadId, body: text, authorId: admin.id } });
  revalidatePath(`/admin/requests/${leadId}`);
  return { ok: true };
}

// ─── Quotes ─────────────────────────────────────────────────────────────────

export type SaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

function flatten(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

const newToken = () => randomBytes(32).toString("base64url");

async function persistDraft(input: QuoteDraftInput, userId: string): Promise<SaveResult> {
  const parsed = quoteDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: flatten(parsed.error) };
  const q = parsed.data;

  const lead = await db.lead.findUnique({ where: { id: q.leadId }, select: { id: true, customerId: true, addressId: true } });
  if (!lead) return { ok: false, errors: { form: "That request no longer exists." } };

  // Totals are always recomputed here from the line items; nothing from the browser is trusted.
  const t = computeTotals(q);
  const data = {
    title: q.title,
    scopeOfWork: q.scopeOfWork,
    exclusions: q.exclusions || null,
    subtotalCents: t.subtotalCents,
    taxRateBps: Math.round(Number(q.taxRatePercent) * 100),
    taxCents: t.taxCents,
    totalCents: t.totalCents,
    depositBps: t.depositBps,
    depositFixedCents: t.depositFixedCents,
    validUntil: new Date(Date.now() + q.validDays * 86_400_000),
  };

  if (q.id) {
    const existing = await db.quote.findUnique({ where: { id: q.id }, select: { status: true, leadId: true } });
    if (!existing || existing.leadId !== lead.id) return { ok: false, errors: { form: "That quote no longer exists." } };
    if (existing.status !== "DRAFT") return { ok: false, errors: { form: "This quote was already sent, so it can't be edited. Void it and create a new one." } };
    await db.$transaction([
      db.quoteLineItem.deleteMany({ where: { quoteId: q.id } }),
      db.quote.update({ where: { id: q.id }, data: { ...data, lineItems: { create: t.items } } }),
      db.quoteEvent.create({ data: { quoteId: q.id, type: "UPDATED" } }),
    ]);
    return { ok: true, id: q.id };
  }

  const quote = await db.quote.create({
    data: {
      ...data,
      publicToken: newToken(), // replaced with a fresh token when the quote is sent
      leadId: lead.id,
      customerId: lead.customerId,
      addressId: lead.addressId,
      createdById: userId,
      status: "DRAFT",
      lineItems: { create: t.items },
      events: { create: { type: "CREATED" } },
    },
  });
  return { ok: true, id: quote.id };
}

export async function saveQuoteDraft(input: QuoteDraftInput): Promise<SaveResult> {
  const admin = await requireCan("manageQuotes");
  const result = await persistDraft(input, admin.id);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export type SendResult =
  | { ok: true; id: string; url: string; emailed: boolean; emailError?: string }
  | { ok: false; errors: Record<string, string>; id?: string };

export async function sendQuote(input: QuoteDraftInput): Promise<SendResult> {
  const admin = await requireCan("manageQuotes");
  const saved = await persistDraft(input, admin.id);
  if (!saved.ok) return saved;

  // Fresh unguessable token at send time; the DRAFT guard stops double-sends from two tabs.
  const token = newToken();
  const now = new Date();
  const sent = await db.quote.updateMany({
    where: { id: saved.id, status: "DRAFT" },
    data: { status: "SENT", publicToken: token, sentAt: now },
  });
  if (sent.count === 0) return { ok: false, id: saved.id, errors: { form: "This quote was already sent." } };

  const quote = await db.quote.findUniqueOrThrow({ where: { id: saved.id }, include: { customer: true, address: true } });
  await db.quoteEvent.create({ data: { quoteId: quote.id, type: "SENT", metadata: { by: admin.email, to: quote.customer.email } } });
  if (quote.leadId) await db.lead.update({ where: { id: quote.leadId }, data: { status: "QUOTE_SENT" } });

  const result = await emailQuote(quote);
  revalidatePath("/admin", "layout");
  return { ok: true, id: quote.id, url: quoteLink(token), emailed: result.ok, emailError: result.ok ? undefined : result.error };
}

const quoteLink = (token: string) => `${env.NEXT_PUBLIC_APP_URL}/quote/${token}`;

async function emailQuote(quote: Awaited<ReturnType<typeof loadQuoteForEmail>>) {
  const site = await getSite();
  const a = quote.address;
  return sendEmail({
    type: "QUOTE_SENT",
    to: quote.customer.email,
    quoteId: quote.id,
    leadId: quote.leadId ?? undefined,
    replyTo: site.email,
    ...(await quoteSent({
      number: quote.number,
      title: quote.title,
      totalCents: quote.totalCents,
      customerName: `${quote.customer.firstName} ${quote.customer.lastName}`,
      customerFirstName: quote.customer.firstName,
      customerEmail: quote.customer.email,
      address: a ? `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.postalCode}` : "",
      url: quoteLink(quote.publicToken),
      validUntil: quote.validUntil,
      depositCents: depositCents(quote),
    })),
  });
}

function loadQuoteForEmail(id: string) {
  return db.quote.findUniqueOrThrow({ where: { id }, include: { customer: true, address: true } });
}

export async function resendQuote(quoteId: string) {
  const admin = await requireCan("manageQuotes");
  const quote = await loadQuoteForEmail(quoteId);
  if (!["SENT", "VIEWED"].includes(quote.status)) return { error: "Only quotes waiting on the client can be resent." };
  const result = await emailQuote(quote);
  await db.quoteEvent.create({ data: { quoteId, type: "SENT", metadata: { by: admin.email, to: quote.customer.email, resend: true } } });
  revalidatePath(`/admin/quotes/${quoteId}`);
  return result.ok ? { ok: true } : { error: `The email didn't send (${result.error}). Copy the link and send it yourself.` };
}

/** Emails the client their remaining balance with a link to pay it on their quote. */
export async function requestBalancePayment(quoteId: string, note: string): Promise<{ ok: boolean; message: string }> {
  const site = await getSite();
  const admin = await requireCan("manageQuotes");
  const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { customer: true, address: true, payments: true } });
  if (!quote) return { ok: false, message: "That quote no longer exists." };
  if (portalState(quote) !== "partially_paid") return { ok: false, message: "Only accepted quotes with a balance due can be billed." };
  const text = note.trim().slice(0, 1000) || null;
  const a = quote.address;
  const result = await sendEmail({
    type: "BALANCE_REQUEST",
    to: quote.customer.email,
    quoteId,
    leadId: quote.leadId ?? undefined,
    replyTo: site.email,
    ...(await balanceRequest({
      number: quote.number,
      title: quote.title,
      totalCents: quote.totalCents,
      customerName: `${quote.customer.firstName} ${quote.customer.lastName}`,
      customerFirstName: quote.customer.firstName,
      customerEmail: quote.customer.email,
      address: a ? `${a.line1}, ${a.city}` : "",
      url: quoteLink(quote.publicToken),
      balanceCents: balanceCents(quote),
      paidCents: paidCents(quote),
      note: text,
    })),
  });
  await db.quoteEvent.create({
    data: { quoteId, type: "BALANCE_REQUESTED", metadata: { by: admin.email, amountCents: balanceCents(quote), emailed: result.ok } },
  });
  revalidatePath(`/admin/quotes/${quoteId}`);
  return result.ok
    ? { ok: true, message: `Balance request for ${formatCents(balanceCents(quote))} sent to ${quote.customer.email}.` }
    : { ok: false, message: `Logged, but the email didn't send (${result.error}). Copy the client link and send it yourself.` };
}

export async function voidQuote(quoteId: string) {
  const admin = await requireCan("voidQuotes");
  const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { payments: true } });
  if (!quote) return { error: "That quote no longer exists." };
  if (["ACCEPTED", "PAID"].includes(quote.status)) return { error: "This quote has payments, so it can't be voided. Refund it in Stripe first." };
  const changed = await db.quote.updateMany({
    where: { id: quoteId, status: { in: ["DRAFT", "SENT", "VIEWED", "EXPIRED", "DECLINED"] } },
    data: { status: "VOID" },
  });
  if (changed.count === 0) return { error: "This quote can't be voided in its current state." };
  await db.quoteEvent.create({ data: { quoteId, type: "VOIDED", metadata: { by: admin.email } } });

  // Close any open checkout so a voided quote can't be paid.
  const stripe = getStripe();
  const pending = quote.payments.filter((p) => p.status === "PENDING" && p.stripeCheckoutSessionId);
  if (stripe && pending.length) {
    await Promise.allSettled(pending.map((p) => stripe.checkout.sessions.expire(p.stripeCheckoutSessionId!)));
    await db.payment.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "CANCELED" } });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
