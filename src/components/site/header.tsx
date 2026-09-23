import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/settings";
import { quoteHref } from "@/lib/site";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export async function Header() {
  const site = await getSite();
  return (
    <header className="sticky top-0 z-40 border-b border-navy-200 bg-stone-50/95 backdrop-blur-sm">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-navy-950 px-4 py-2 text-stone-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Container className="flex h-18 items-center gap-6">
        <Link href="/" className="shrink-0 rounded-control">
          <Logo />
          <span className="sr-only">Home</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <NavLinks
            className="flex items-center gap-7"
            linkClassName="py-2 font-medium after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-copper-500 after:opacity-0 aria-[current=page]:after:opacity-100"
          />
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <a
            href={site.phoneHref}
            className="hidden items-center gap-2 rounded-control px-2 py-2 font-semibold text-navy-950 hover:text-copper-700 xl:inline-flex"
          >
            <Phone aria-hidden className="size-4" />
            {site.phone}
          </a>
          <ButtonLink href={quoteHref} size="sm" className="sm:h-11 sm:px-5 sm:text-base">
            <span className="sm:hidden">Get a quote</span>
            <span className="hidden sm:inline">Request a quote</span>
          </ButtonLink>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
