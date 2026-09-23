import { NextResponse } from "next/server";
import { coiRequestSchema } from "@/lib/coi";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { flattenErrors } from "@/lib/quote-request/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSite } from "@/lib/settings";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function POST(request: Request) {
  const site = await getSite();
  if (!rateLimit(`coi:${clientIp(request.headers)}`, 3, 10 * 60_000)) {
    return NextResponse.json({ ok: false, errors: { form: "Too many requests. Wait a few minutes, or email us." } }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (body?.company) return NextResponse.json({ ok: true }); // honeypot
  const input = Object.fromEntries(
    Object.keys(coiRequestSchema.shape).map((k) => [k, typeof body?.[k] === "string" ? body[k] : ""]),
  );
  const parsed = coiRequestSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: flattenErrors(parsed.error) }, { status: 400 });
  const r = parsed.data;

  const lines: [string, string][] = [
    ["Name", r.name],
    ["Email", r.email],
    ["Organization", r.organization || "(none)"],
    ["Property", r.address],
    ["Notes", r.notes || "(none)"],
  ];
  const result = await sendEmail({
    type: "COI_REQUEST_NOTICE",
    to: env.CONTRACTOR_NOTIFY_EMAIL ?? site.email,
    replyTo: r.email,
    subject: `Certificate of insurance request: ${r.address}`,
    text: lines.map(([k, v]) => `${k}: ${v}`).join("\n"),
    html: `<p><strong>Certificate of insurance request</strong></p>${lines.map(([k, v]) => `<p><strong>${esc(k)}:</strong> ${esc(v)}</p>`).join("")}<p>Ask the insurer to send the certificate directly to the requester.</p>`,
  });

  // The request is logged either way; tell the person to email if delivery isn't configured.
  if (!result.ok && result.error !== "not_configured") {
    return NextResponse.json({ ok: false, errors: { form: `Your request didn't send. Email us at ${site.email} instead.` } }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
