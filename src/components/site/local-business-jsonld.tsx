import { getSite } from "@/lib/settings";
import { brand, serviceAreas } from "@/lib/site";

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * schema.org data for search engines. Hill & Stone is a service-area business, so it lists
 * the towns served rather than a street address. Unset or placeholder facts are left out.
 */
export async function LocalBusinessJsonLd() {
  const site = await getSite();
  const data = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${base}/#business`,
    name: brand.fullName,
    alternateName: brand.name,
    legalName: brand.legalName,
    description: "Home repair, carpentry, drywall and painting, flooring, exterior repair and small renovations in Northwest Arkansas.",
    url: base,
    logo: `${base}/apple-icon`,
    image: `${base}/opengraph-image`,
    ...(site.phoneIsPlaceholder ? {} : { telephone: `+1${site.phoneHref.replace(/\D/g, "").slice(-10)}` }),
    email: site.email,
    areaServed: serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}, AR` })),
    address: { "@type": "PostalAddress", addressRegion: "AR", addressCountry: "US" },
    ...(site.googleReviewsUrl ? { sameAs: [site.googleReviewsUrl] } : {}),
    knowsAbout: ["Home repair", "Finish carpentry", "Drywall repair", "Interior painting", "Flooring installation", "Deck repair"],
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
