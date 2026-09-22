import { Heading } from "@/components/ui/heading";
import type { Service } from "@/lib/site";
import { cn } from "@/lib/utils";

/** A service laid out like the scope section of a real estimate. */
export function ScopeSheet({ service, className, headingAs = "h3" }: { service: Service; className?: string; headingAs?: "h2" | "h3" }) {
  return (
    <article id={service.slug} className={cn("scroll-mt-28 rounded-panel border border-navy-200 bg-white", className)}>
      <header className="border-b border-navy-200 p-6 sm:p-8">
        <Heading as={headingAs} level="sub">
          {service.name}
        </Heading>
        <p className="mt-2 max-w-[60ch] text-navy-600">{service.summary}</p>
      </header>
      <div className="grid sm:grid-cols-2">
        <div className="p-6 sm:p-8">
          <h4 className="text-sm font-semibold">What we do</h4>
          <ul className="mt-3 space-y-2">
            {service.weDo.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden className="mt-3 h-0.5 w-3 shrink-0 bg-copper-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-navy-200 bg-stone-100 p-6 sm:border-t-0 sm:border-l sm:p-8">
          <h4 className="text-sm font-semibold">What we don&apos;t take on</h4>
          <ul className="mt-3 space-y-2 text-navy-600">
            {service.weDont.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
