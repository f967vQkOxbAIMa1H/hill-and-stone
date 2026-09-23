import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewStaffForm } from "@/components/admin/team-forms";
import { requireCan } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/auth/temp-password";

export const metadata: Metadata = { title: "Add team member" };

export default async function NewStaffPage() {
  await requireCan("manageTeam");
  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link prefetch={false} href="/admin/team" className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Team
        </Link>
        <h1 className="mt-2 font-semiwide text-2xl font-bold sm:text-3xl">Add team member</h1>
        <p className="mt-1 max-w-[70ch] text-navy-600">Create their login with a temporary password. You&apos;ll see the password once, to give them yourself.</p>
      </header>
      <div className="px-5 py-6 sm:px-8">
        <NewStaffForm initialPassword={generateTempPassword()} />
      </div>
    </>
  );
}
