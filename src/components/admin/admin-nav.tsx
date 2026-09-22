"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Inbox, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
];

export function AdminNav({ pending }: { pending: number }) {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 lg:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const current = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-control px-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:gap-3 sm:px-3 sm:text-base",
                current ? "bg-navy-800 text-stone-50" : "text-navy-300 hover:bg-navy-900 hover:text-stone-50",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
              {href === "/admin/requests" && pending > 0 && (
                <span className="ml-auto rounded-full bg-copper-500 px-1.5 text-sm font-bold text-navy-950">
                  {pending}
                  <span className="sr-only"> pending review</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
