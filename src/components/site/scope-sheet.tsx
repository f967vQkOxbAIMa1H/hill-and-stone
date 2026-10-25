import { ServiceIllustration } from "@/components/illustrations/service-illustration";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Heading } from "@/components/ui/heading";
import type { Service } from "@/lib/site";
import { cn } from "@/lib/utils";

/** A service laid out like the scope section of a real estimate. */
export function ScopeSheet({
  service,
  number,
  className,
  headingAs = "h3",
  delay = 0,
}: {
  service: Service;
  /** Serif "01"-style numeral above the name. */
  number?: string;
  className?: string;
  headingAs?: "h2" | "h3";
  delay?: number;
}) {
  return (
    <ScrollReveal as="article" id={service.slug} delay={delay} className={cn("slate scroll-mt-28 overflow-hidden rounded-panel", className)}>
      <header className="grid items-center gap-6 border-b border-navy-200 p-6 sm:grid-cols-[minmax(0,1fr)_200px] sm:p-8">
        <div>
          {number && <span className="numeral text-lg text-navy-600">{number}</span>}
          <Heading as={headingAs} level="sub" className={number ? "mt-2" : undefined}>
            {service.name}
          </Heading>
          <p className="mt-2 max-w-[60ch] text-navy-700">{service.summary}</p>
        </div>
        <ServiceIllustration category={service.category} replayFrom="article" className="order-first aspect-[3/2] w-full max-w-56 sm:order-none sm:max-w-none" />
      </header>
      <div className="grid sm:grid-cols-2">
        <div className="p-6 sm:p-8">
          <h4 className="text-sm font-semibold">What we do</h4>
          <ul className="mt-3 space-y-2">
            {service.weDo.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden className="mt-3 h-0.5 w-3 shrink-0 bg-accent-500" />
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
    </ScrollReveal>
  );
}
