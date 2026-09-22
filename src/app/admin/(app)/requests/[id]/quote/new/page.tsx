import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { QuoteBuilder } from "@/components/admin/quote-builder";
import { builderLead, newQuoteInput } from "@/lib/admin/builder-initial";
import { getLead } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "New quote" };

export default async function NewQuotePage({ params }: PageProps<"/admin/requests/[id]/quote/new">) {
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  return (
    <>
      <header className="border-b border-navy-200 px-5 py-6 sm:px-8">
        <Link href={`/admin/requests/${lead.id}`} className="inline-flex items-center gap-1 text-sm text-navy-600 hover:text-navy-950">
          <ChevronLeft aria-hidden className="size-4" />
          Request #{lead.number}
        </Link>
        <h1 className="mt-2 font-semiwide text-2xl font-bold sm:text-3xl">New quote</h1>
        <p className="mt-1 max-w-[70ch] truncate text-navy-600">&ldquo;{lead.description}&rdquo;</p>
      </header>
      <QuoteBuilder lead={builderLead(lead)} initial={newQuoteInput(lead)} />
    </>
  );
}
