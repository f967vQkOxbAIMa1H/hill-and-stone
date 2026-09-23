import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fmtDateTime } from "@/components/admin/format";
import { AccessPanel, ResetPasswordPanel, StaffEditForm } from "@/components/admin/team-forms";
import { Badge } from "@/components/ui/badge";
import { isStaffRole, roleInfo } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Team member" };

export default async function StaffPage({ params }: PageProps<"/admin/team/[id]">) {
  const me = await requireCan("manageTeam");
  const user = await db.user.findUnique({ where: { id: (await params).id } });
  if (!user || !isStaffRole(user.role)) notFound();
  const isSelf = user.id === me.id;
  const name = user.name ?? user.email;
  const phone = user.phone ? `(${user.phone.slice(0, 3)}) ${user.phone.slice(3, 6)}-${user.phone.slice(6)}` : "";

  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/team" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Team
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-semiwide text-2xl font-bold sm:text-3xl">{name}</h1>
          <Badge tone="dark">{roleInfo[user.role].label}</Badge>
          {user.deactivatedAt && <Badge tone="danger">Access revoked</Badge>}
        </div>
        <p className="mt-1 text-navy-600">
          {user.lastLoginAt ? `Last signed in ${fmtDateTime(user.lastLoginAt)}.` : "Hasn't signed in yet."}
          {user.deactivatedAt ? ` Access revoked ${fmtDateTime(user.deactivatedAt)}.` : ""}
        </p>
      </header>
      <div className="grid gap-10 px-5 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="details-h">
          <h2 id="details-h" className="mb-4 font-bold">
            Details
          </h2>
          <StaffEditForm isSelf={isSelf} initial={{ id: user.id, name: user.name ?? "", email: user.email, phone, role: user.role }} />
        </section>
        <aside className="space-y-6">
          <section aria-labelledby="pw-h" className="rounded-panel border border-navy-200 bg-white p-5">
            <h2 id="pw-h" className="font-bold">
              Password
            </h2>
            {isSelf ? (
              <p className="mt-2 text-sm text-navy-600">
                Change your own password from{" "}
                <Link prefetch={false} href="/admin/password" className="font-semibold text-copper-700 underline underline-offset-4">
                  My account
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="mt-1 mb-3 text-sm text-navy-600">
                  {user.mustChangePassword ? "They still have a temporary password." : "Forgot their password? Give them a new temporary one."}
                </p>
                <ResetPasswordPanel userId={user.id} name={name} />
              </>
            )}
          </section>
          {!isSelf && (
            <section aria-labelledby="access-h" className="rounded-panel border border-navy-200 bg-white p-5">
              <h2 id="access-h" className="font-bold">
                Access
              </h2>
              <p className="mt-1 mb-3 text-sm text-navy-600">
                {user.deactivatedAt ? "They can't sign in. Restore access to let them back in." : "Revoke access when someone leaves. Their history stays."}
              </p>
              <AccessPanel userId={user.id} name={name} active={!user.deactivatedAt} />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
