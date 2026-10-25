import { Star } from "lucide-react";
import { getSite } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <p className={cn("flex gap-0.5 text-accent-500", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={cn("size-5", i < rating ? "fill-current" : "text-navy-300")} />
      ))}
      <span className="sr-only">{rating} out of 5 stars</span>
    </p>
  );
}

export function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2-1.9 3.3-4.7 3.3-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}

/** Hidden until the Google review link is set in business settings. */
export async function GoogleReviewsLink({ className }: { className?: string }) {
  const site = await getSite();
  if (!site.googleReviewsUrl) return null;
  return (
    <a
      href={site.googleReviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-control border border-navy-200 bg-white px-4 py-2.5 font-semibold hover:border-navy-950",
        className,
      )}
    >
      <GoogleG />
      Read our reviews on Google
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
