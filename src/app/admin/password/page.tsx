import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { roleInfo, type StaffRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

// Outside the admin layout so people with a temporary password can reach it.
export default async function PasswordPage() {
  const me = await requireAdmin({ allowPasswordChange: true });
  const required = me.mustChangePassword;
  return (
    <main className="flex flex-1 items-center justify-center bg-navy-950 px-5 py-16">
      <div className="w-full max-w-sm">
        <Logo tone="light" />
        <div className="mt-8 rounded-panel bg-stone-50 p-6 sm:p-8">
          <h1 className="font-semiwide text-2xl font-bold">{required ? "Choose your password" : "My account"}</h1>
          <p className="mt-1 text-sm text-navy-600">
            {required
              ? "You signed in with a temporary password. Set your own to continue."
              : `${me.name ?? me.email}, ${roleInfo[me.role as StaffRole].label.toLowerCase()}.`}
          </p>
          <div className="mt-6">
            <ChangePasswordForm required={required} />
          </div>
        </div>
        {!required && (
          <Link prefetch={false} href="/admin" className="mt-4 inline-block text-sm font-semibold text-navy-300 hover:text-stone-50">
            Back to the admin
          </Link>
        )}
      </div>
    </main>
  );
}
