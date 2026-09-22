import Link from "next/link";
import { cn } from "@/lib/utils";

/** Filter links with counts. Plain links, so filters are shareable and work without JS. */
export function StatusTabs({
  base,
  current,
  tabs,
  label,
  extra = "",
}: {
  base: string;
  current?: string;
  tabs: { value?: string; label: string; count: number }[];
  label: string;
  extra?: string;
}) {
  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-navy-200">
        {tabs.map((t) => {
          const active = (t.value ?? "") === (current ?? "");
          const href = t.value ? `${base}?status=${t.value}${extra}` : `${base}${extra ? `?${extra.slice(1)}` : ""}`;
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                  active ? "border-copper-500 text-navy-950" : "border-transparent text-navy-600 hover:text-navy-950",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-xs font-semibold", active ? "bg-navy-950 text-stone-50" : "bg-navy-200 text-navy-700")}>{t.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
