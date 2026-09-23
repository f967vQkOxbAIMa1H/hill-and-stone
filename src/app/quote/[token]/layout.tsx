import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/settings";

// Private, per-customer pages: never indexed, and the token never leaks via Referer.
export const metadata: Metadata = {
  title: "Your quote",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function QuoteLayout({ children }: LayoutProps<"/quote/[token]">) {
  const site = await getSite();
  return (
    <>
      <header className="border-b border-navy-200 bg-stone-50">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="rounded-control">
            <Logo />
            <span className="sr-only">Hill &amp; Stone home page</span>
          </Link>
          <a href={site.phoneHref} className="inline-flex items-center gap-2 text-sm font-semibold hover:text-copper-700">
            <Phone aria-hidden className="size-4" />
            <span className="hidden sm:inline">Questions? </span>
            {site.phone}
          </a>
        </Container>
      </header>
      <main id="main" className="flex-1 bg-stone-100">
        {children}
      </main>
      <footer className="border-t border-navy-200 bg-stone-100">
        <Container className="flex flex-col gap-1 py-6 pb-28 text-sm text-navy-600 sm:flex-row sm:justify-between lg:pb-6">
          <p>
            {site.legalName}.{site.licenseNumber ? ` ${site.licenseLabel} ${site.licenseNumber}.` : ""}
          </p>
          <p>
            <Link href="/trust#payments" className="underline-offset-4 hover:underline">
              How payments are secured
            </Link>
          </p>
        </Container>
      </footer>
    </>
  );
}
