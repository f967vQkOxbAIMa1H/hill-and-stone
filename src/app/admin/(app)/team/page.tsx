import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ago } from "@/components/admin/format";
import { AdminHeader } from "@/components/admin/page-header";
import { PhoneList, PhoneRow } from "@/components/admin/phone-list";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { roleInfo, staffRoles, type StaffRole } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireCan("manageTeam");
  const users = await db.user.findMany({
    where: { role: { in: [...staffRoles] } },
    orderBy: [{ deactivatedAt: { sort: "asc", nulls: "first" } }, { role: "asc" }, { name: "asc" }],
  });

  const statusOf = (u: (typeof users)[number]) =>
    u.deactivatedAt
      ? { label: "Access revoked", tone: "danger" as const }
      : !u.passwordHash
        ? { label: "No password set", tone: "neutral" as const }
        : u.mustChangePassword
          ? { label: "Waiting for first sign-in", tone: "accent" as const }
          : { label: "Active", tone: "success" as const };

  return (
    <>
      <AdminHeader
        title="Team"
        description="Everyone who can sign in to this admin, and what their role lets them do."
        actions={
          <ButtonLink prefetch={false} href="/admin/team/new">
            <UserPlus aria-hidden />
            Add team member
          </ButtonLink>
        }
      />
      <div className="px-5 py-6 sm:px-8">
        <PhoneList>
          {users.map((u) => {
            const status = statusOf(u);
            return (
              <PhoneRow
                key={u.id}
                href={`/admin/team/${u.id}`}
                muted={!!u.deactivatedAt}
                title={
                  <>
                    {u.name ?? u.email}
                    {u.id === me.id && <span className="font-normal text-navy-600"> (you)</span>}
                  </>
                }
                lines={[roleInfo[u.role as StaffRole].label, `Last sign-in ${u.lastLoginAt ? ago(u.lastLoginAt) : "never"}`]}
                aside={<Badge tone={status.tone}>{status.label}</Badge>}
              />
            );
          })}
        </PhoneList>
        <div className="hidden overflow-x-auto rounded-panel border border-navy-200 bg-white md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-navy-200 bg-stone-50 text-navy-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-200">
              {users.map((u) => {
                const status = statusOf(u);
                return (
                  <tr key={u.id} className={u.deactivatedAt ? "group relative text-navy-600 hover:bg-stone-50" : "group relative hover:bg-stone-50"}>
                    <td className="px-4 py-3">
                      <Link prefetch={false} href={`/admin/team/${u.id}`} className="font-semibold after:absolute after:inset-0 group-hover:text-accent-700">
                        {u.name ?? u.email}
                        {u.id === me.id && <span className="font-normal text-navy-600"> (you)</span>}
                      </Link>
                      <span className="block text-navy-600">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">{roleInfo[u.role as StaffRole].label}</td>
                    <td className="px-4 py-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-navy-600">{u.lastLoginAt ? ago(u.lastLoginAt) : "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section aria-labelledby="roles-h" className="mt-10 max-w-3xl">
          <h2 id="roles-h" className="font-bold">
            What each role can do
          </h2>
          <dl className="mt-3 divide-y divide-navy-200 border-y border-navy-200">
            {staffRoles.map((r) => (
              <div key={r} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold">{roleInfo[r].label}</dt>
                <dd className="text-navy-700">{roleInfo[r].description}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
