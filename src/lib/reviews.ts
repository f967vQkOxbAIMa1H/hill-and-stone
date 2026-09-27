// Review rules shared by the public form, the API route, content queries and tests. Client-safe.
import { z } from "zod";
import { stripTags } from "@/lib/sanitize";

/** Reviews at or above this rating show on the site automatically. Anything lower never does. */
export const PUBLIC_MIN_RATING = 4;

export const isPublicRating = (rating: number) => rating >= PUBLIC_MIN_RATING;

/**
 * Subject tag for low-rating feedback. Set up an inbox filter on this text to file these emails into a
 * "Feedback/Low-Rating" folder (Gmail: Settings > Filters > Subject contains "[Feedback/Low-Rating]" >
 * Apply label "Feedback/Low-Rating", Skip the inbox) so they stay out of the quote request flow.
 */
export const LOW_RATING_SUBJECT_TAG = "[Feedback/Low-Rating]";

/** Sent as an email header and a Resend tag too, for inboxes and logs that can filter on them. */
export const LOW_RATING_CATEGORY = "Feedback/Low-Rating";

const text = (max: number) => z.string().overwrite(stripTags).trim().max(max);
const starError = { error: "Choose a star rating." };

export const reviewSubmissionSchema = z.object({
  // Only a number or a numeric string: plain coercion would also turn [5] into 5.
  rating: z
    .union([z.number(), z.string()], starError)
    .transform(Number)
    .pipe(z.number().int(starError).min(1, starError).max(5, starError)),
  authorName: text(80).min(2, "Enter your name as you'd like it shown, like Jordan E."),
  city: text(60).min(2, "Enter your town, like Fayetteville."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email like you@example.com.")),
  body: text(2000)
    .min(10, "Tell us a little about the job, at least a sentence.")
    .max(2000, "Keep your review under 2,000 characters."),
});

export type ReviewSubmission = z.output<typeof reviewSubmissionSchema>;

/** What happens to a submitted review: published on the site, or held privately and sent to the owner. */
export function routeReview(rating: number): { published: boolean; notifyLowRating: boolean } {
  const pub = isPublicRating(rating);
  return { published: pub, notifyLowRating: !pub };
}
