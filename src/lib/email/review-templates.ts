import "server-only";
import { LOW_RATING_SUBJECT_TAG, type ReviewSubmission } from "@/lib/reviews";
import { getSite } from "@/lib/settings";
import { esc, layout, rows } from "./templates";

/** To the business inbox: a review under 4 stars. It was saved privately and is not on the site. */
export async function lowRatingFeedback(r: ReviewSubmission & { adminUrl: string }) {
  const site = await getSite();
  const stars = `${r.rating} star${r.rating === 1 ? "" : "s"}`;
  const subject = `${LOW_RATING_SUBJECT_TAG} ${stars} from ${r.authorName}, ${r.city}`;
  const details: [string, string][] = [
    ["Rating", `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} (${stars})`],
    ["From", `${r.authorName}, ${r.city}`],
    ["Email", r.email],
    ["Feedback", r.body],
  ];
  const html = layout(
    site,
    `<p style="margin:0 0 8px;font-size:20px;font-weight:800">Private feedback: ${esc(stars)}</p>
<p style="margin:0 0 12px;color:#475569">Reviews under 4 stars are kept off the website. This one is saved privately in the admin. Reply to this email to reach the customer directly.</p>
${rows(details)}
<p style="margin:0"><a href="${esc(r.adminUrl)}" style="color:#b45309;font-weight:bold">Open it in the admin</a></p>`,
  );
  const text = `Private feedback (${stars}). Kept off the website.\n\n${details.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nAdmin: ${r.adminUrl}`;
  return { subject, html, text };
}
