import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/settings";
import { estimateLabel, quoteHref } from "@/lib/site";
import { HeaderShell } from "./header-shell";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

/** Sticky header. Its colors are --hdr-* variables (globals.css) that HeaderShell flips per section. */
export async function Header() {
  const site = await getSite();
  return (
    <HeaderShell className="site-header sticky top-0 z-40 border-b backdrop-blur-md">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-navy-950 px-4 py-2 text-stone-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Container className="flex h-18 items-center gap-4 sm:gap-6">
        <Link href="/" className="shrink-0 rounded-control">
          <Logo tone="current" />
          <span className="sr-only">Home</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <NavLinks
            className="flex items-center gap-6 whitespace-nowrap xl:gap-7"
            linkClassName="py-2 font-medium text-(--hdr-muted) hover:text-(--hdr-fg) aria-[current=page]:text-(--hdr-fg) after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-(--hdr-mark) after:opacity-0 aria-[current=page]:after:opacity-100"
          />
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-4">
          <a
            href={site.phoneHref}
            className="hidden items-center gap-2 rounded-control px-2 py-2 font-semibold whitespace-nowrap hover:text-(--hdr-muted) min-[1360px]:inline-flex"
          >
            <Phone aria-hidden className="size-4" />
            {site.phone}
          </a>
          <Link
            href={quoteHref}
            className="inline-flex h-10 items-center justify-center rounded-control bg-(--hdr-btn-bg) px-3.5 text-sm font-semibold whitespace-nowrap text-(--hdr-btn-fg) hover:bg-(--hdr-btn-hover) sm:h-11 sm:px-5 sm:text-base"
          >
            <span className="sm:hidden">Estimate</span>
            <span className="hidden sm:inline">{estimateLabel}</span>
          </Link>
          <MobileNav />
        </div>
      </Container>
    </HeaderShell>
  );
}
