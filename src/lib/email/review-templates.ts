import "server-only";
import { LOW_RATING_SUBJECT_TAG, type ReviewSubmission } from "@/lib/reviews";
import { getSite } from "@/lib/settings";
import { esc, layout, rows } from "./templates";

/** To the business inbox: a review under 4 stars. It was saved privately and is not on the site. */
export async function lowRatingFeedback(r: ReviewSubmission & { email: string; jobTitle: string; adminUrl: string }) {
  const site = await getSite();
  const stars = `${r.rating} star${r.rating === 1 ? "" : "s"}`;
  const subject = `${LOW_RATING_SUBJECT_TAG} ${stars} from ${r.authorName}, ${r.city}`;
  const details: [string, string][] = [
    ["Rating", `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} (${stars})`],
    ["From", `${r.authorName}, ${r.city}`],
    ["Email", r.email],
    ["Job", r.jobTitle],
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

/** To the customer once their job is paid: a private, single-use link to leave a review. */
export async function reviewInviteEmail(r: { firstName: string; jobTitle: string; url: string; days: number }) {
  const site = await getSite();
  const subject = `How did we do, ${r.firstName}?`;
  const html = layout(
    site,
    `<p style="margin:0 0 12px;font-size:22px;font-weight:800">Thanks for having us, ${esc(r.firstName)}.</p>
<p style="margin:0 0 12px">How did the job go (${esc(r.jobTitle)})? A short review helps neighbors find someone they can trust with their house, and tells us what to keep doing.</p>
<p style="margin:20px 0"><a href="${esc(r.url)}" style="display:inline-block;background:#d97706;color:#0f172a;font-weight:bold;text-decoration:none;padding:14px 22px;border-radius:4px">Leave a review</a></p>
<p style="margin:0 0 12px;font-size:14px;color:#475569">This link is just for you and works once, for the next ${r.days} days. If something isn't right with the work, reply to this email or call ${esc(site.phone)} and we'll come back and fix it.</p>`,
  );
  const text = `Thanks for having us, ${r.firstName}.\n\nHow did the job go (${r.jobTitle})? Leave a review: ${r.url}\n\nThis link is just for you and works once, for the next ${r.days} days. If something isn't right, reply or call ${site.phone}.`;
  return { subject, html, text };
}
