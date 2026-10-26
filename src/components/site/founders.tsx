import Image from "next/image";
import { BrandPanel } from "@/components/brand/brand-panel";
import type { SiteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Reserved portrait frames for the two co-founders. Each frame holds its place with the brand graphic
 * until a photo is set in `brand.photos` (src/lib/site.ts). The second frame sits lower, like stacked stone.
 */
export function FounderPortraits({ site, className }: { site: SiteConfig; className?: string }) {
  const [first, second] = site.founders;
  const people = [
    { src: site.photos.founder, name: first.name, role: "Co-founder" },
    { src: site.photos.coFounder, name: second.name, role: "Co-founder" },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:gap-6", className)}>
      {people.map((p, i) => (
        <figure key={i} className={cn(i === 1 && "mt-10 sm:mt-16")}>
          {p.src ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-photo bg-navy-900">
              <Image src={p.src} alt={`${p.name}, ${p.role.toLowerCase()} of Hill & Stone`} fill sizes="(min-width: 1024px) 22vw, 50vw" className="object-cover" />
            </div>
          ) : (
            <BrandPanel mark={false} tone={i === 0 ? "navy" : "stone"} className="aspect-[4/5] rounded-photo" />
          )}
          <figcaption className="mt-3 border-t border-navy-200 pt-2 text-sm">
            <span className="block font-semibold text-navy-950">{p.name}</span>
            <span className="text-navy-600">{p.role}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
