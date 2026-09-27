import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { lowRatingFeedback } from "@/lib/email/review-templates";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { flattenErrors } from "@/lib/quote-request/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { LOW_RATING_CATEGORY, reviewSubmissionSchema, routeReview } from "@/lib/reviews";
import { getSite } from "@/lib/settings";

/**
 * Customer reviews from the site. 4 and 5 stars publish automatically; under 4 stars are saved
 * privately and emailed to the business inbox, tagged for a Feedback/Low-Rating folder.
 */
export async function POST(request: Request) {
  if (!rateLimit(`review:${clientIp(request.headers)}`, 3, 60 * 60_000)) {
    return NextResponse.json({ ok: false, errors: { form: "Too many reviews from this connection. Try again later." } }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  // Honeypot: bots that fill the hidden field get a fake success and nothing is saved.
  if (body?.website_url_hp) return NextResponse.json({ ok: true, published: true });

  const input = Object.fromEntries(Object.keys(reviewSubmissionSchema.shape).map((k) => [k, body?.[k] ?? ""]));
  const parsed = reviewSubmissionSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: flattenErrors(parsed.error) }, { status: 400 });
  const r = parsed.data;
  const { published, notifyLowRating } = routeReview(r.rating);

  const saved = await db.testimonial.create({
    data: {
      authorName: r.authorName,
      city: r.city,
      body: r.body,
      rating: r.rating,
      authorEmail: r.email,
      source: "website",
      published,
      reviewedAt: new Date(),
    },
  });

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
        replyTo: r.email,
        headers: { "X-Hill-Stone-Category": LOW_RATING_CATEGORY },
        tags: [{ name: "category", value: "feedback-low-rating" }],
        ...(await lowRatingFeedback({ ...r, adminUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/reviews/${saved.id}` })),
      });
    });
  }

  return NextResponse.json({ ok: true, published });
}
