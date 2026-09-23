"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { BrandPanel } from "@/components/brand/brand-panel";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";
import { useSite } from "@/components/site-provider";
import { quoteHref } from "@/lib/site";

const destinations = [
  { href: "/services", label: "Services", note: "What we do and don't take on" },
  { href: "/our-work", label: "Our work", note: "Before-and-after projects" },
  { href: "/service-areas", label: "Service areas", note: "Check your ZIP code" },
  { href: "/faq", label: "Questions and answers", note: "Pricing, scheduling, warranty" },
];

/** Shared layout for the 404 and error pages: say what happened, then offer the useful next steps. */
export function ErrorScreen({ title, lede, action }: { title: string; lede: string; action?: React.ReactNode }) {
  const site = useSite();
  return (
    <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
      <div>
        <Heading as="h1" level="page" className="max-w-[16ch]">
          {title}
        </Heading>
        <Lede className="mt-5">{lede}</Lede>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {action ?? (
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Go to the home page
            </Link>
          )}
          <a href={site.phoneHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <Phone aria-hidden />
            {site.phone}
          </a>
        </div>
        <nav aria-label="Popular pages" className="mt-12 max-w-xl">
          <h2 className="text-sm font-semibold text-navy-600">Or try one of these</h2>
          <ul className="mt-3 divide-y divide-navy-200 border-y border-navy-200">
            {[...destinations, { href: quoteHref, label: "Request a quote", note: "Send photos and get a price" }].map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="flex items-baseline justify-between gap-4 py-3 hover:text-copper-700">
                  <span className="font-semibold">{d.label}</span>
                  <span className="text-right text-sm text-navy-600">{d.note}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <BrandPanel className="hidden aspect-[4/5] rounded-photo lg:flex" />
    </Container>
  );
}
