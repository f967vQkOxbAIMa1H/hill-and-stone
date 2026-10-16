import "server-only";
import { db } from "@/lib/db";
import { reviewInviteEmail } from "@/lib/email/review-templates";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { isValidTokenFormat } from "@/lib/quotes/state";
import { getSite } from "@/lib/settings";
import { createQuoteToken } from "@/lib/tokens";

/** How long a review link stays usable. */
export const REVIEW_INVITE_DAYS = 90;

export const reviewUrl = (token: string) => `${env.NEXT_PUBLIC_APP_URL}/review/${token}`;

/** The quote's review invite, created on first call. One invite per quote, reused on resend. */
async function ensureInvite(quoteId: string) {
  const expiresAt = new Date(Date.now() + REVIEW_INVITE_DAYS * 86_400_000);
  return db.reviewInvite.upsert({
    where: { quoteId },
    create: { quoteId, token: createQuoteToken(), expiresAt },
    // A resend of an unused link extends it; a used link stays used.
    update: {},
  });
}

/**
 * Emails the customer their private review link. Called automatically when a quote is paid in full,
 * and from the admin to resend. Never throws: a failed email must not undo a payment.
 */
export async function sendReviewInvite(quoteId: string, by?: string): Promise<{ ok: boolean; message: string; url?: string }> {
  try {
    const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { customer: true } });
    if (!quote) return { ok: false, message: "That quote no longer exists." };
    if (quote.status !== "PAID") return { ok: false, message: "Review links go out once a job is paid in full." };
    let invite = await ensureInvite(quoteId);
    if (invite.usedAt) return { ok: false, message: "This customer already left a review.", url: reviewUrl(invite.token) };
    if (invite.expiresAt < new Date()) {
      invite = await db.reviewInvite.update({ where: { id: invite.id }, data: { expiresAt: new Date(Date.now() + REVIEW_INVITE_DAYS * 86_400_000) } });
    }
    const site = await getSite();
    const url = reviewUrl(invite.token);
    const result = await sendEmail({
      type: "REVIEW_INVITE",
      to: quote.customer.email,
      quoteId,
      replyTo: site.email,
      ...(await reviewInviteEmail({ firstName: quote.customer.firstName, jobTitle: quote.title, url, days: REVIEW_INVITE_DAYS })),
    });
    await db.quoteEvent.create({ data: { quoteId, type: "REVIEW_REQUESTED", metadata: { emailed: result.ok, ...(by ? { by } : {}) } } });
    return result.ok
      ? { ok: true, message: `Review link sent to ${quote.customer.email}.`, url }
      : { ok: false, message: `The email didn't send (${result.error}). Copy the review link and send it yourself.`, url };
  } catch (error) {
    console.error("sendReviewInvite failed", quoteId, error);
    return { ok: false, message: "The review link couldn't be created. Try again." };
  }
}

export type InviteLookup =
  | { status: "ok"; invite: NonNullable<Awaited<ReturnType<typeof findInvite>>> }
  | { status: "used" | "expired" | "invalid" };

function findInvite(token: string) {
  return db.reviewInvite.findUnique({
    where: { token },
    include: { quote: { select: { title: true, customer: { select: { firstName: true, lastName: true, email: true } }, address: { select: { city: true } } } } },
  });
}

/** Resolves a review link. Malformed tokens are rejected before touching the database. */
export async function lookupInvite(token: string): Promise<InviteLookup> {
  if (!isValidTokenFormat(token)) return { status: "invalid" };
  const invite = await findInvite(token);
  if (!invite) return { status: "invalid" };
  if (invite.usedAt) return { status: "used" };
  if (invite.expiresAt < new Date()) return { status: "expired" };
  return { status: "ok", invite };
}
