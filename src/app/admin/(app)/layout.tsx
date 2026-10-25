import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/brand/logo";
import { AdminNav, AdminTabBar } from "@/components/admin/admin-nav";
import { capabilitiesOf, roleInfo, type StaffRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin links use prefetch={false}: every admin page is a live, DB-backed render, and prefetching
// the dozens of links on a list page would run those queries for pages nobody opens.

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const pending = await db.lead.count({ where: { status: "PENDING_REVIEW" } });

  const account = { name: admin.name ?? admin.email, role: roleInfo[admin.role as StaffRole].label };

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* Phones and tablets: a slim brand bar on top, navigation in the tab bar at the bottom. */}
      <header className="flex h-14 shrink-0 items-center bg-navy-950 px-4 text-stone-50 lg:hidden">
        <Link prefetch={false} href="/admin" className="flex items-center gap-2.5 rounded-control px-1">
          <Logo tone="light" />
        </Link>
      </header>
      <AdminTabBar pending={pending} capabilities={capabilitiesOf(admin.role)} account={account} />

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 bg-navy-950 px-4 py-6 text-stone-50 lg:flex">
        <Link prefetch={false} href="/admin" className="flex items-center gap-2.5 rounded-control px-1">
          <Logo tone="light" />
        </Link>
        <nav aria-label="Admin" className="mt-6">
          <AdminNav pending={pending} capabilities={capabilitiesOf(admin.role)} />
        </nav>
        <div className="mt-auto border-t border-navy-800 pt-4">
          <Link prefetch={false} href="/admin/password" className="block rounded-control px-1 hover:bg-navy-900">
            <span className="block truncate text-sm font-semibold">{account.name}</span>
            <span className="block truncate text-sm text-navy-400">{account.role}, my account</span>
          </Link>
          <form action={logout} className="mt-3">
            <button type="submit" className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-sm text-navy-300 hover:bg-navy-900 hover:text-stone-50">
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      {/* Bottom padding keeps the last row clear of the fixed tab bar. */}
      <main id="main" className="min-w-0 flex-1 bg-stone-50 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
    </div>
  );
}
