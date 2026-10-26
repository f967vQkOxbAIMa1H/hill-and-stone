"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { nav } from "@/lib/site";
import { cn } from "@/lib/utils";

/** `items` comes from getNav() on the server, so links to empty sections are already left out. */
export function NavLinks({ items, className, linkClassName }: { items: readonly (typeof nav)[number][]; className?: string; linkClassName?: string }) {
  const pathname = usePathname();

  return (
    <ul className={className}>
      {items.map((item) => {
        const current = !item.href.includes("#") && pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn("relative transition-colors", linkClassName)}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
