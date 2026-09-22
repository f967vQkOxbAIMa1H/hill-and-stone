import { Mail, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { site } from "@/lib/site";

export default function QuoteNotFound() {
  return (
    <Container className="py-20 sm:py-28">
      <div className="max-w-xl">
        <Heading as="h1" level="page">
          We can&apos;t find that quote
        </Heading>
        <p className="mt-5 text-lg text-navy-700">
          The link may be incomplete. Open it again from the email we sent, and make sure the whole link was copied. If it
          still doesn&apos;t work, contact us and we&apos;ll resend it.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={site.phoneHref} className={buttonVariants({ size: "lg" })}>
            <Phone aria-hidden />
            Call {site.phone}
          </a>
          <a href={`mailto:${site.email}?subject=Resend%20my%20quote%20link`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Mail aria-hidden />
            Email us
          </a>
        </div>
      </div>
    </Container>
  );
}
