import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * List tables collapse to this on phones: one tappable row per record with the name on the left
 * and the figure or status that matters on the right, instead of a table scrolled out of view.
 * Pair it with `hidden md:block` on the table's wrapper.
 */
export function PhoneList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-navy-200 overflow-hidden rounded-panel border border-navy-200 bg-white md:hidden", className)}>{children}</ul>;
}

export function PhoneRow({
  href,
  title,
  lines,
  aside,
  muted,
}: {
  href: string;
  title: React.ReactNode;
  lines?: React.ReactNode[];
  aside?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li>
      <Link prefetch={false} href={href} className={cn("flex items-center gap-3 py-3 pr-2 pl-4 active:bg-stone-100", muted && "text-navy-600")}>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {lines?.filter(Boolean).map((l, i) => (
            <span key={i} className="mt-0.5 block text-sm text-navy-600">
              {l}
            </span>
          ))}
        </span>
        {aside && <span className="flex shrink-0 flex-col items-end gap-1 text-right text-sm">{aside}</span>}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-navy-400" />
      </Link>
    </li>
  );
}
