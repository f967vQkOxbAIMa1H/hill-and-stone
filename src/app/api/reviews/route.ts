import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { lowRatingFeedback } from "@/lib/email/review-templates";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { flattenErrors } from "@/lib/quote-request/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupInvite } from "@/lib/review-invites";
import { LOW_RATING_CATEGORY, reviewSubmissionSchema, routeReview } from "@/lib/reviews";
import { getSite } from "@/lib/settings";

const linkProblem = {
  used: "This link has already been used to leave a review. Thank you!",
  expired: "This review link has expired. Reply to our email and we'll send a new one.",
  invalid: "This review link isn't valid. Use the link from our email.",
} as const;

/**
 * Customer reviews, only through the private single-use link emailed after a paid job. 4 and 5 stars
 * publish automatically; under 4 stars are saved privately and emailed to the business inbox, tagged
 * for a Feedback/Low-Rating folder.
 */
export async function POST(request: Request) {
  if (!(await rateLimit(`review:${clientIp(request.headers)}`, 5, 60 * 60_000))) {
    return NextResponse.json({ ok: false, errors: { form: "Too many attempts from this connection. Try again later." } }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  // Honeypot: bots that fill the hidden field get a fake success and nothing is saved.
  if (body?.website_url_hp) return NextResponse.json({ ok: true, published: true });

  const input = Object.fromEntries(Object.keys(reviewSubmissionSchema.shape).map((k) => [k, body?.[k] ?? ""]));
  const parsed = reviewSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "token")) {
      return NextResponse.json({ ok: false, errors: { form: linkProblem.invalid } }, { status: 404 });
    }
    return NextResponse.json({ ok: false, errors: flattenErrors(parsed.error) }, { status: 400 });
  }
  const r = parsed.data;

  const found = await lookupInvite(r.token);
  if (found.status !== "ok") {
    return NextResponse.json({ ok: false, errors: { form: linkProblem[found.status] } }, { status: found.status === "invalid" ? 404 : 410 });
  }
  const { invite } = found;
  const customer = invite.quote.customer;
  const { published, notifyLowRating } = routeReview(r.rating);

  // Claim the link and save the review together, so a link can only ever be used once.
  const saved = await db.$transaction(async (tx) => {
    const claimed = await tx.reviewInvite.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count === 0) return null;
    const testimonial = await tx.testimonial.create({
      data: {
        authorName: r.authorName,
        city: r.city,
        body: r.body,
        rating: r.rating,
        authorEmail: customer.email,
        source: "website",
        published,
        reviewedAt: new Date(),
      },
    });
    await tx.reviewInvite.update({ where: { id: invite.id }, data: { testimonialId: testimonial.id } });
    return testimonial;
  });
  if (!saved) return NextResponse.json({ ok: false, errors: { form: linkProblem.used } }, { status: 410 });

  if (published) {
    revalidatePath("/reviews");
    revalidatePath("/");
  }

  if (notifyLowRating) {
    after(async () => {
      const site = await getSite();
      await sendEmail({
        type: "LOW_RATING_FEEDBACK",
        // The central business inbox. Filtered into Feedback/Low-Rating by its subject tag.
        to: env.CONTRACTOR_NOTIFY_EMAIL ?? site.email,
        replyTo: customer.email,
        headers: { "X-Hill-Stone-Category": LOW_RATING_CATEGORY },
        tags: [{ name: "category", value: "feedback-low-rating" }],
        ...(await lowRatingFeedback({ ...r, email: customer.email, jobTitle: invite.quote.title, adminUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/reviews/${saved.id}` })),
      });
    });
  }

  return NextResponse.json({ ok: true, published });
}
