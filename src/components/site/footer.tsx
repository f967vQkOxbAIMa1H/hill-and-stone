import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/settings";
import { nav, quoteHref, serviceAreas } from "@/lib/site";

export async function Footer() {
  const site = await getSite();
  const core = serviceAreas.filter((a) => a.core);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-navy-300">
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-[34ch]">
            Home repair, carpentry and small renovations across Benton and Washington counties.
          </p>
          <Link href={quoteHref} className="mt-5 inline-block font-semibold text-copper-500 underline-offset-4 hover:underline">
            Request a quote
          </Link>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-semibold text-stone-50">Pages</h2>
          <ul className="mt-4 space-y-2.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-stone-50">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/trust" className="hover:text-stone-50">
                Insurance &amp; warranty
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-semibold text-stone-50">Where we work</h2>
          <ul className="mt-4 space-y-2.5">
            {core.map((a) => (
              <li key={a.slug}>
                <Link href={`/service-areas#${a.slug}`} className="hover:text-stone-50">
                  {a.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/service-areas" className="hover:text-stone-50">
                All service areas
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-stone-50">Contact</h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={site.phoneHref} className="font-semibold text-stone-50 hover:text-copper-500">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-stone-50">
                {site.email}
              </a>
            </li>
            <li>{site.hours}</li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-navy-800">
        <Container className="flex flex-col gap-2 py-6 text-sm text-navy-400 md:flex-row md:justify-between">
          <p>
            {[site.licenseNumber && `${site.licenseLabel} ${site.licenseNumber}.`, site.insuranceSummary ? `${site.insuranceSummary}.` : "Licensed and insured."]
              .filter(Boolean)
              .join(" ")}
          </p>
          <p>
            © {year} {site.legalName}
          </p>
        </Container>
      </div>
    </footer>
  );
}
