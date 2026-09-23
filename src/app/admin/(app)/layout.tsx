import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { LogoMark } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { capabilitiesOf, roleInfo, type StaffRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin links use prefetch={false}: every admin page is a live, DB-backed render, and prefetching
// the dozens of links on a list page would run those queries for pages nobody opens.

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const pending = await db.lead.count({ where: { status: "PENDING_REVIEW" } });

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-navy-950 px-4 py-4 text-stone-50 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:py-6">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link prefetch={false} href="/admin" className="flex items-center gap-2.5 rounded-control px-1">
            <LogoMark className="text-stone-50" />
            <span className="font-wide text-lg leading-none font-extrabold">Hill &amp; Stone</span>
          </Link>
          <form action={logout} className="lg:hidden">
            <button type="submit" className="flex h-10 cursor-pointer items-center gap-2 rounded-control px-3 text-sm text-navy-300 hover:text-stone-50">
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </form>
        </div>
        <nav aria-label="Admin" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mt-6">
          <AdminNav pending={pending} capabilities={capabilitiesOf(admin.role)} />
        </nav>
        <div className="mt-auto hidden border-t border-navy-800 pt-4 lg:block">
          <Link prefetch={false} href="/admin/password" className="block rounded-control px-1 hover:bg-navy-900">
            <span className="block truncate text-sm font-semibold">{admin.name ?? admin.email}</span>
            <span className="block truncate text-sm text-navy-400">{roleInfo[admin.role as StaffRole].label}, my account</span>
          </Link>
          <form action={logout} className="mt-3">
            <button type="submit" className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-control px-2 text-sm text-navy-300 hover:bg-navy-900 hover:text-stone-50">
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 bg-stone-50">
        {children}
      </main>
    </div>
  );
}
