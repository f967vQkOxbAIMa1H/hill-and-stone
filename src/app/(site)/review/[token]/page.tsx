import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/site/review-form";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { lookupInvite } from "@/lib/review-invites";
import { getSite } from "@/lib/settings";

// Private, single-use links: never cache, index or leak them (see next.config.ts headers too).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leave a review", robots: { index: false, follow: false } };

export default async function ReviewInvitePage({ params }: PageProps<"/review/[token]">) {
  const { token } = await params;
  const [found, site] = await Promise.all([lookupInvite(token), getSite()]);
  if (found.status === "invalid") notFound();

  if (found.status !== "ok") {
    return (
      <Container className="py-20 sm:py-28">
        <div className="max-w-xl">
          <Heading as="h1" level="page">
            {found.status === "used" ? "Thanks, your review is in" : "This review link has expired"}
          </Heading>
          <Lede className="mt-5">
            {found.status === "used"
              ? "This link has already been used. Thank you for taking the time."
              : `Write to ${site.email} and we'll send you a new one.`}
          </Lede>
        </div>
      </Container>
    );
  }

  const { quote } = found.invite;
  const { firstName, lastName, email } = quote.customer;
  return (
    <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
      <div>
        <Heading as="h1" level="page" className="max-w-[12ch]">
          How did we do, {firstName}?
        </Heading>
        <Lede className="mt-5">
          For your job: {quote.title}. Tell us how it went. It takes a minute.
        </Lede>
      </div>
      <div className="slate rounded-panel p-5 sm:p-8">
        <ReviewForm
          token={token}
          ownerName={site.story.founderName}
          defaultName={`${firstName} ${lastName.slice(0, 1).toUpperCase()}.`.trim()}
          defaultCity={quote.address?.city ?? ""}
          email={email}
        />
      </div>
    </Container>
  );
}
