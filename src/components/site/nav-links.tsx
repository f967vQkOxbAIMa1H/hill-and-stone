"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function NavLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const pathname = usePathname();

  return (
    <ul className={className}>
      {nav.map((item) => {
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
