import "server-only";
import { Resend } from "resend";
import type { EmailType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
// Production: "Hill & Stone Home Solutions <quotes@hillandstonehome.com>" once the domain is verified in Resend.
const FROM = env.EMAIL_FROM ?? "Hill & Stone Home Solutions <onboarding@resend.dev>";

type SendArgs = {
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  leadId?: string;
  quoteId?: string;
  /** Extra headers, e.g. a category for inbox filters. */
  headers?: Record<string, string>;
  /** Resend tags (letters, numbers, _ and - only), for filtering in the Resend dashboard. */
  tags?: { name: string; value: string }[];
};

/**
 * Sends through Resend and records every attempt in EmailLog.
 * Never throws: email failure must not fail the request that triggered it.
 */
export async function sendEmail({ type, to, subject, html, text, replyTo, leadId, quoteId, headers, tags }: SendArgs) {
  const log = await db.emailLog
    .create({ data: { type, to, subject, leadId, quoteId } })
    .catch((e) => (console.error("EmailLog create failed", e), null));

  const update = (data: Parameters<typeof db.emailLog.update>[0]["data"]) =>
    log ? db.emailLog.update({ where: { id: log.id }, data }).catch(() => null) : null;

  if (!resend) {
    console.info(`[email:dev] RESEND_API_KEY not set. Would send "${subject}" to ${to}`);
    await update({ status: "FAILED", error: "RESEND_API_KEY not configured; email not sent" });
    return { ok: false as const, error: "not_configured" };
  }

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html, text, replyTo: replyTo ?? env.EMAIL_REPLY_TO, headers, tags });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    await update({ status: "SENT", providerMessageId: data?.id });
    return { ok: true as const, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Email send failed", type, message);
    await update({ status: "FAILED", error: message.slice(0, 1000) });
    return { ok: false as const, error: message };
  }
}
