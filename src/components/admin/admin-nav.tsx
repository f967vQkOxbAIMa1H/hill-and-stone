"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { FileText, Images, Inbox, LayoutDashboard, LogOut, Menu, Settings, Star, UserRound, Users, X } from "lucide-react";
import { logout } from "@/app/admin/actions";
import type { Capability } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/portfolio", label: "Portfolio", icon: Images, needs: "manageContent" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, needs: "manageContent" },
  { href: "/admin/team", label: "Team", icon: Users, needs: "manageTeam" },
  { href: "/admin/settings/site", label: "Site settings", icon: Settings, needs: "manageSettings" },
] as { href: string; label: string; icon: typeof FileText; exact?: boolean; needs?: Capability }[];

// The three screens the crew lives in get a tab of their own on phones; the rest sit under More.
const TABS = 3;

function useItems(capabilities: Capability[]) {
  const pathname = usePathname();
  const allowed = items.filter((i) => !i.needs || capabilities.includes(i.needs));
  const isCurrent = (i: (typeof items)[number]) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));
  return { pathname, allowed, isCurrent };
}

function PendingCount({ pending }: { pending: number }) {
  return (
    <span className="rounded-full bg-copper-500 px-1.5 text-sm leading-5 font-bold text-navy-950 tabular-nums">
      {pending}
      <span className="sr-only"> pending review</span>
    </span>
  );
}

/** Sidebar list on large screens. */
export function AdminNav({ pending, capabilities }: { pending: number; capabilities: Capability[] }) {
  const { allowed, isCurrent } = useItems(capabilities);
  return (
    <ul className="flex flex-col gap-1">
      {allowed.map((item) => {
        const { href, label, icon: Icon } = item;
        const current = isCurrent(item);
        return (
          <li key={href}>
            <Link prefetch={false}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-control px-3 font-medium whitespace-nowrap transition-colors",
                current ? "bg-navy-800 text-stone-50" : "text-navy-300 hover:bg-navy-900 hover:text-stone-50",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
              {href === "/admin/requests" && pending > 0 && <span className="ml-auto"><PendingCount pending={pending} /></span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom tab bar on phones and tablets, in thumb reach. More opens a sheet with everything else. */
export function AdminTabBar({
  pending,
  capabilities,
  account,
}: {
  pending: number;
  capabilities: Capability[];
  account: { name: string; role: string };
}) {
  const { pathname, allowed, isCurrent } = useItems(capabilities);
  const sheet = useRef<HTMLDialogElement>(null);
  const tabs = allowed.slice(0, TABS);
  const rest = allowed.slice(TABS);
  const moreCurrent = rest.some(isCurrent) || pathname.startsWith("/admin/password");

  // Close the sheet once a link in it has navigated.
  useEffect(() => {
    sheet.current?.close();
  }, [pathname]);

  const tabClass = (current: boolean) =>
    cn(
      "relative flex h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-sm font-medium transition-colors",
      "before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-b-full before:bg-copper-500 before:opacity-0 before:transition-opacity",
      current ? "text-stone-50 before:opacity-100" : "text-navy-300 active:text-stone-50",
    );

  return (
    <>
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-800 bg-navy-950 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map((item) => {
            const { href, label, icon: Icon } = item;
            const current = isCurrent(item);
            return (
              <li key={href} className="flex flex-1">
                <Link prefetch={false} href={href} aria-current={current ? "page" : undefined} className={tabClass(current)}>
                  <span className="relative">
                    <Icon aria-hidden className="size-5" />
                    {href === "/admin/requests" && pending > 0 && (
                      <span className="absolute -top-2 left-3.5">
                        <PendingCount pending={pending} />
                      </span>
                    )}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => {
                sheet.current?.showModal();
                // Focus the sheet itself rather than its close button, so a tap doesn't land on a focus ring.
                sheet.current?.focus();
              }}
              aria-haspopup="dialog"
              className={tabClass(moreCurrent)}
            >
              <Menu aria-hidden className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={sheet}
        aria-label="More"
        tabIndex={-1}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="admin-sheet mx-0 outline-none mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-panel bg-stone-50 p-0 text-navy-950 backdrop:bg-navy-950/60 lg:hidden"
      >
        <div className="px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <p className="font-semiwide text-lg font-bold">More</p>
            <button
              type="button"
              onClick={() => sheet.current?.close()}
              className="-mr-2 flex size-11 cursor-pointer items-center justify-center rounded-control text-navy-600 hover:bg-stone-100 hover:text-navy-950"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {rest.length > 0 && (
            <ul className="mt-2 divide-y divide-navy-200 overflow-hidden rounded-panel border border-navy-200 bg-white">
              {rest.map((item) => {
                const { href, label, icon: Icon } = item;
                const current = isCurrent(item);
                return (
                  <li key={href}>
                    <Link
                      prefetch={false}
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className="flex h-14 items-center gap-3 px-4 font-semibold hover:bg-stone-50 aria-[current=page]:text-copper-700"
                    >
                      <Icon aria-hidden className="size-5 text-navy-600" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 overflow-hidden rounded-panel border border-navy-200 bg-white">
            <Link
              prefetch={false}
              href="/admin/password"
              aria-current={pathname.startsWith("/admin/password") ? "page" : undefined}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
            >
              <UserRound aria-hidden className="size-5 shrink-0 text-navy-600" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{account.name}</span>
                <span className="block truncate text-sm text-navy-600">{account.role}, change password</span>
              </span>
            </Link>
            <form action={logout} className="border-t border-navy-200">
              <button type="submit" className="flex h-14 w-full cursor-pointer items-center gap-3 px-4 font-semibold text-danger-700 hover:bg-danger-100">
                <LogOut aria-hidden className="size-5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
