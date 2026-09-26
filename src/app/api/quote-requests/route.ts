import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addBusinessDays } from "@/lib/dates";
import { sendEmail } from "@/lib/email/send";
import { contractorNotification, customerConfirmation } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { UPLOAD_LIMITS } from "@/lib/quote-request/options";
import { attributionSchema, flattenErrors, quoteRequestSchema, type FieldErrors } from "@/lib/quote-request/schema";
import { getSite } from "@/lib/settings";
import { serviceAreas } from "@/lib/site";
import { deleteFiles, putFile, sniffImage, type StoredFile } from "@/lib/storage";

export const runtime = "nodejs";

const fail = (status: number, errors: FieldErrors) => NextResponse.json({ ok: false, errors }, { status });

export async function POST(request: Request) {
  const site = await getSite();
  // 5 requests per connection every 15 minutes.
  if (!rateLimit(`quote:${clientIp(request.headers)}`, 5, 15 * 60_000)) {
    return fail(429, { form: "Too many requests from this connection. Wait a few minutes, or call us." });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, { form: "The form didn't come through. Check your connection and try again." });
  }

  // Honeypot: real people never see or fill this field. Bots that do get a fake success; nothing is
  // saved, stored or emailed.
  if (String(form.get("website_url_hp") ?? "").trim()) {
    return NextResponse.json({ ok: true, number: 0, replyBy: addBusinessDays(new Date(), site.replyBusinessDays).toISOString() });
  }

  // Missing fields become "" so they get the friendly "required" messages, not zod's type errors.
  const fields = Object.fromEntries(
    Object.keys(quoteRequestSchema.shape).map((k) => {
      const v = form.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  );
  const parsed = quoteRequestSchema.safeParse(fields);
  if (!parsed.success) return fail(400, flattenErrors(parsed.error));
  const req = parsed.data;

  let attribution = {};
  try {
    attribution = attributionSchema.parse(JSON.parse(String(form.get("attribution") ?? "{}")));
  } catch {
    // Attribution is best-effort; ignore malformed values.
  }

  // Files: re-check everything the client checked, and identify type by content.
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > UPLOAD_LIMITS.maxFiles) return fail(400, { photos: `Attach up to ${UPLOAD_LIMITS.maxFiles} photos.` });
  const images: { file: File; data: Buffer; mime: string; ext: string }[] = [];
  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.maxBytes) return fail(400, { photos: `${file.name} is over 10 MB. Remove it or attach a smaller copy.` });
    const data = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(data);
    if (!kind) return fail(400, { photos: `${file.name} isn't a JPG, PNG or WebP image.` });
    images.push({ file, data, ...kind });
  }

  const stored: (StoredFile & { fileName: string; mimeType: string })[] = [];
  try {
    const prefix = `leads/${new Date().toISOString().slice(0, 7)}`;
    for (const img of images) {
      const s = await putFile(prefix, img.ext, img.data, img.mime);
      stored.push({ ...s, fileName: img.file.name.slice(0, 200), mimeType: img.mime });
    }

    const serviceArea = serviceAreas.find((a) => a.zips.includes(req.postalCode))?.slug ?? null;

    const lead = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: req.email },
        create: {
          firstName: req.firstName,
          lastName: req.lastName,
          email: req.email,
          phone: req.phone,
          preferredContact: req.preferredContact,
        },
        // Don't let a form overwrite an existing customer's name; do keep contact details current.
        update: { phone: req.phone, preferredContact: req.preferredContact },
      });
      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          line1: req.line1,
          line2: req.line2 || null,
          city: req.city,
          postalCode: req.postalCode,
          serviceArea,
        },
      });
      const lead = await tx.lead.create({
        data: {
          customerId: customer.id,
          addressId: address.id,
          category: req.category,
          description: req.description,
          timeline: req.timeline,
          budgetRange: req.budgetRange,
          preferredContact: req.preferredContact,
          status: "PENDING_REVIEW",
          source: "website",
          ...attribution,
          attachments: {
            create: stored.map((s) => ({
              kind: "PHOTO" as const,
              storageKey: s.storageKey,
              fileName: s.fileName,
              mimeType: s.mimeType,
              sizeBytes: s.sizeBytes,
            })),
          },
        },
      });
      await tx.conversionEvent.create({
        data: { name: "quote_submitted", leadId: lead.id, path: "/request-a-quote", properties: { category: req.category } },
      });
      return lead;
    });

    const replyBy = addBusinessDays(new Date(), site.replyBusinessDays);
    const info = { number: lead.number, replyBy, photoCount: stored.length };

    after(async () => {
      const toCustomer = await customerConfirmation(req, info);
      await sendEmail({ type: "LEAD_CONFIRMATION", to: req.email, leadId: lead.id, replyTo: site.email, ...toCustomer });
      if (env.CONTRACTOR_NOTIFY_EMAIL) {
        const toOwner = await contractorNotification(req, { ...info, serviceArea });
        await sendEmail({ type: "LEAD_NOTIFICATION", to: env.CONTRACTOR_NOTIFY_EMAIL, leadId: lead.id, replyTo: req.email, ...toOwner });
      }
    });

    return NextResponse.json({ ok: true, number: lead.number, replyBy: replyBy.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Quote request failed", error);
    await deleteFiles(stored.map((s) => s.storageKey));
    return fail(500, { form: `Your request didn't save. Try again, or call us at ${site.phone}.` });
  }
}
