"use client";

import { Menu, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { estimateLabel, quoteHref, type nav } from "@/lib/site";
import { useSite } from "@/components/site-provider";
import { cn } from "@/lib/utils";
import { NavLinks } from "./nav-links";

/** Native <dialog> gives focus trapping, Esc to close and inert background for free. */
export function MobileNav({ items }: { items: readonly (typeof nav)[number][] }) {
  const site = useSite();
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close after navigating.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex size-11 items-center justify-center rounded-control hover:bg-(--hdr-hover-wash) lg:hidden"
        aria-haspopup="dialog"
      >
        <Menu aria-hidden />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="mobile-drawer m-0 ml-auto h-dvh max-h-none w-[min(100vw,380px)] max-w-none bg-stone-50 p-0 text-navy-950 backdrop:bg-navy-950/50 lg:hidden"
      >
        <div className="flex h-full flex-col px-5 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={cn(buttonVariants({ variant: "ghost", size: "md" }), "px-3")}
            >
              <X aria-hidden />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <nav aria-label="Main" className="mt-8">
            <NavLinks
              items={items}
              className="flex flex-col"
              linkClassName="block border-b border-navy-200 py-4 font-serif text-2xl text-navy-950 hover:text-accent-700 aria-[current=page]:text-accent-700"
            />
          </nav>

          <div className="mt-auto flex flex-col gap-3 pb-4">
            <ButtonLink href={quoteHref} size="lg">
              {estimateLabel}
            </ButtonLink>
            <a href={site.phoneHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Phone aria-hidden />
              Call {site.phone}
            </a>
            <p className="text-center text-sm text-navy-600">{site.hours}</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
