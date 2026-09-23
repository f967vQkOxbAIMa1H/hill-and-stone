import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="px-5 py-16 sm:px-8">
      <h1 className="font-semiwide text-2xl font-bold">That record doesn&apos;t exist</h1>
      <p className="mt-2 max-w-[60ch] text-navy-600">It may have been deleted, or the link is incomplete.</p>
      <div className="mt-6 flex gap-2">
        <Link prefetch={false} href="/admin/requests" className={buttonVariants({ variant: "dark" })}>
          Go to requests
        </Link>
        <Link prefetch={false} href="/admin/quotes" className={buttonVariants({ variant: "outline" })}>
          Go to quotes
        </Link>
      </div>
    </div>
  );
}
