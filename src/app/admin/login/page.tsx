import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { getAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdmin()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center bg-navy-950 px-5 py-16">
      <div className="w-full max-w-sm">
        <Logo tone="light" />
        <div className="mt-8 rounded-panel bg-stone-50 p-6 sm:p-8">
          <h1 className="font-semiwide text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-navy-600">Requests, quotes and payments.</p>
          <LoginForm next={typeof next === "string" ? next : ""} />
        </div>
      </div>
    </main>
  );
}
