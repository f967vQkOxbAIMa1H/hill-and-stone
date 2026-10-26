import { getSite } from "@/lib/settings";
import { appUrl as base, brand, serviceAreas, services } from "@/lib/site";

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
    description: "Interior repairs, exterior repairs, property maintenance and home improvements for homeowners, landlords and property managers in Northwest Arkansas.",
    url: base,
    logo: `${base}/apple-icon`,
    image: `${base}/opengraph-image`,
    ...(site.phoneIsPlaceholder ? {} : { telephone: `+1${site.phoneHref.replace(/\D/g, "").slice(-10)}` }),
    email: site.email,
    areaServed: serviceAreas.map((a) => ({ "@type": "City", name: `${a.name}, AR` })),
    address: { "@type": "PostalAddress", addressRegion: "AR", addressCountry: "US" },
    ...(site.googleReviewsUrl ? { sameAs: [site.googleReviewsUrl] } : {}),
    knowsAbout: ["Home repair", "Drywall repair", "Finish carpentry", "Pressure washing", "Fence repair", "Property maintenance"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.summary, url: `${base}/services#${s.slug}` },
      })),
    },
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
