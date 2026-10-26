// Single source of truth for business facts and service content.
import type { ServiceCategory } from "@/generated/prisma/enums";

import type { Settings } from "@/lib/settings/schema";

/* ════════════════════════════════════════════════════════════════════════════
 * BUSINESS DEFAULTS
 * The owner edits these at /admin/settings/site; saved values override the defaults below.
 * `npm run check:launch` lists anything still unset or unconfirmed.
 *
 * Anything null is simply left off the site (no brackets, no fake numbers).
 * ════════════════════════════════════════════════════════════════════════════ */

/** Brand facts that change with a rebrand, not day to day. Edited here, in code. */
export const brand = {
  /** Short name for running copy ("Call Hill & Stone"). */
  name: "Hill & Stone",
  /** Display name: the header lockup, page titles, emails. */
  fullName: "Hill & Stone Home Solutions",
  /** Exact legal name: footer copyright, terms/privacy, structured data, email footers. */
  legalName: "Hill and Stone Home Solutions LLC",
  /** Registered domain. The canonical site is https://www.hillandstonehome.com (NEXT_PUBLIC_APP_URL). */
  domain: "hillandstonehome.com",
  /** Canonical origin, used when NEXT_PUBLIC_APP_URL isn't set (local builds use localhost instead). */
  url: "https://www.hillandstonehome.com",
  tagline: "Reliable Northwest Arkansas home repairs, done right.",
  /** Prefix for the license number, shown only once a number is entered in settings. */
  licenseLabel: "Arkansas license",
  /** The co-founders, in the order the About page story introduces them. */
  founders: [
    { name: "Aidan Sanders", firstName: "Aidan" },
    { name: "Tucker Davidson", firstName: "Tucker" },
  ],
  /**
   * Photos in /public/images. Each missing photo keeps its reserved frame with a brand graphic instead.
   * founder = Aidan, coFounder = Tucker (About page, in the order of `founders`).
   */
  photos: {
    founder: null as string | null, // "/images/founder-aidan.jpg"
    coFounder: null as string | null, // "/images/founder-tucker.jpg"
    team: null as string | null,
    crew: null as string | null,
  },
};

/**
 * Public origin for canonical tags, the sitemap, structured data and links in emails, without a trailing slash.
 * Set NEXT_PUBLIC_APP_URL; production builds without it fall back to the canonical www domain.
 */
export const appUrl = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? brand.url : "http://localhost:3000")).replace(/\/$/, "");

/** Starting values until the owner saves settings in the admin. */
export const defaultSettings: Settings = {
  // Carried over from the owner's local admin settings. The public email is the owner's inbox until
  // info@hillandstonehome.com forwarding is set up; change it at /admin/settings/site.
  contact: {
    phone: "870-421-1331",
    email: "tdavidsonmanagement@outlook.com",
    hours: "Mon–Fri 8am–12pm, 1pm-5pm",
  },
  license: { number: null },
  // Every trust claim stays off the site until the owner turns it on in settings.
  claims: { insured: false, bonded: false, backgroundChecked: false, warranty: false, satisfactionGuarantee: false },
  insurance: [
    { type: "General liability", detail: null },
    { type: "Workers' compensation", detail: null },
    { type: "Commercial auto", detail: null },
  ],
  warrantyMonths: 12,
  googleReviewsUrl: null,
  policies: { replyBusinessDays: 1, coiBusinessDays: 2, backgroundRecheckYears: 2, confirmed: false },
  quoteDefaults: { tripFee: "0", taxRatePercent: "9.75", validDays: 30, confirmed: false },
};

/* ─── Derived values used by the site. ─── */

export const businessDays = (n: number) => (n === 1 ? "one business day" : n === 2 ? "two business days" : `${n} business days`);

/** True while a phone number is the fictional 555-01xx placeholder. */
export const isPlaceholderPhone = (phone: string) => /555-?01\d\d$/.test(phone.replace(/[^\d-]/g, ""));

/** Everything pages, emails and components read, built from the current settings. */
export function buildSite(settings: Settings) {
  const digits = settings.contact.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const claims = settings.claims;
  const licenseNumber = settings.license.number;
  // Insurer details only show while the "insured" claim is on.
  const insured = claims.insured
    ? settings.insurance.filter((i): i is { type: Settings["insurance"][number]["type"]; detail: string } => !!i.detail)
    : [];
  const months = settings.warrantyMonths;
  const coverage = [claims.insured && "insured", claims.bonded && "bonded"].filter(Boolean).join(" and ");
  const credentialLine = [coverage && `${coverage[0].toUpperCase()}${coverage.slice(1)}.`, licenseNumber && `${brand.licenseLabel} ${licenseNumber}.`]
    .filter(Boolean)
    .join(" ");
  return {
    name: brand.name,
    fullName: brand.fullName,
    legalName: brand.legalName,
    tagline: brand.tagline,
    phone: settings.contact.phone,
    phoneHref: `tel:+1${digits}`,
    phoneIsPlaceholder: isPlaceholderPhone(settings.contact.phone),
    email: settings.contact.email,
    hours: settings.contact.hours,
    domain: brand.domain,
    licenseLabel: brand.licenseLabel,
    /** Null until a license number is entered in settings. */
    licenseNumber,
    insured: claims.insured,
    bonded: claims.bonded,
    backgroundChecked: claims.backgroundChecked,
    satisfactionGuarantee: claims.satisfactionGuarantee,
    /** "12-month workmanship warranty", or null while the warranty claim is off. */
    warranty: claims.warranty ? `${months % 12 === 0 ? `${months / 12}-year` : `${months}-month`} workmanship warranty` : null,
    /** Insurance rows that have real details (empty unless insured is on). */
    insurance: insured,
    /** Short line for footers, or null when no details are set. */
    insuranceSummary: insured[0] ? `Insured: ${insured[0].detail} ${insured[0].type.toLowerCase()}` : null,
    /** "Insured and bonded. Arkansas license 0123." Null when no credential is turned on. */
    credentialLine: credentialLine || null,
    /** True when at least one trust claim is on, so trust sections have something to say. */
    hasTrustClaims: !!(licenseNumber || claims.insured || claims.bonded || claims.backgroundChecked || claims.warranty || claims.satisfactionGuarantee),
    googleReviewsUrl: settings.googleReviewsUrl,
    replyBusinessDays: settings.policies.replyBusinessDays,
    replyWindow: businessDays(settings.policies.replyBusinessDays),
    coiWindow: businessDays(settings.policies.coiBusinessDays),
    backgroundRecheckYears: settings.policies.backgroundRecheckYears,
    policiesConfirmed: settings.policies.confirmed,
    founders: brand.founders,
    photos: brand.photos,
    quoteDefaults: settings.quoteDefaults,
  };
}

export type SiteConfig = ReturnType<typeof buildSite>;

/** Footer and page-title label for /trust: names what it covers, given the claims that are on. */
export function trustPageLabel(site: SiteConfig) {
  if (site.insured && site.warranty) return "Insurance & warranty";
  if (site.insured) return "Insurance";
  if (site.warranty) return "Warranty & payments";
  if (site.hasTrustClaims) return "Our standards";
  return "Secure payments";
}

/** Defaults only, for the few places that can't load settings (the global error page, the social image). */
export const defaultSite = buildSite(defaultSettings);

export type ServiceArea = {
  slug: string;
  name: string;
  county: "Washington" | "Benton" | "Madison" | "Carroll";
  core: boolean;
  zips: string[];
  /** Approximate center, for the service-zone map. */
  lat: number;
  lng: number;
};

export const serviceAreas: ServiceArea[] = [
  // 72702 is Fayetteville's PO-box ZIP; customers sometimes give it as their address.
  { slug: "fayetteville", name: "Fayetteville", county: "Washington", core: true, zips: ["72701", "72702", "72703", "72704"], lat: 36.0626, lng: -94.1574 },
  { slug: "springdale", name: "Springdale", county: "Washington", core: true, zips: ["72762", "72764"], lat: 36.1867, lng: -94.1288 },
  { slug: "rogers", name: "Rogers", county: "Benton", core: true, zips: ["72756", "72758"], lat: 36.332, lng: -94.1185 },
  { slug: "bentonville", name: "Bentonville", county: "Benton", core: true, zips: ["72712", "72713"], lat: 36.3729, lng: -94.2088 },
  { slug: "bella-vista", name: "Bella Vista", county: "Benton", core: false, zips: ["72714", "72715"], lat: 36.4815, lng: -94.2733 },
  { slug: "lowell", name: "Lowell", county: "Benton", core: false, zips: ["72745"], lat: 36.2554, lng: -94.1307 },
  { slug: "cave-springs", name: "Cave Springs", county: "Benton", core: false, zips: ["72718"], lat: 36.2634, lng: -94.2319 },
  { slug: "centerton", name: "Centerton", county: "Benton", core: false, zips: ["72719"], lat: 36.3598, lng: -94.2852 },
  { slug: "johnson", name: "Johnson", county: "Washington", core: false, zips: ["72741"], lat: 36.1329, lng: -94.1655 },
  { slug: "farmington", name: "Farmington", county: "Washington", core: false, zips: ["72730"], lat: 36.042, lng: -94.2471 },
  { slug: "prairie-grove", name: "Prairie Grove", county: "Washington", core: false, zips: ["72753"], lat: 35.9759, lng: -94.3177 },
  { slug: "elkins", name: "Elkins", county: "Washington", core: false, zips: ["72727"], lat: 36.0015, lng: -94.0083 },
  { slug: "pea-ridge", name: "Pea Ridge", county: "Benton", core: false, zips: ["72751"], lat: 36.4537, lng: -94.1152 },
];

export type Service = {
  slug: string;
  category: ServiceCategory;
  name: string;
  /** The approved category description: homepage cards, /services and structured data. */
  summary: string;
  weDo: string[];
  weDont: string[];
};

/**
 * The four service categories (Revision 1). Mapping from the old six, applied to existing leads and
 * projects by the 20261025120000_four_service_categories migration:
 *   General repairs, Carpentry/doors/trim, Drywall/painting, Flooring/fixtures/hardware -> Interior Repairs
 *   Exterior repairs -> Exterior Repairs · Small renovations/custom -> Home Improvements
 */
export const services: Service[] = [
  {
    slug: "interior-repairs",
    category: "INTERIOR_REPAIRS",
    name: "Interior Repairs",
    summary: "Drywall patches, trim and baseboards, doors, hardware, caulking, touch-up painting, shelving, cabinets and minor carpentry.",
    weDo: ["Drywall patches and texture matching", "Trim, baseboards and casing", "Door adjustments, repairs and installs", "Hardware, hinges and handles", "Caulking and touch-up painting", "Shelving, cabinets and minor carpentry"],
    weDont: ["Major plumbing (re-piping, water heaters)", "Electrical panel or new circuit work", "HVAC repair", "Structural framing or load-bearing walls", "Lead paint abatement or mold remediation"],
  },
  {
    slug: "exterior-repairs",
    category: "EXTERIOR_REPAIRS",
    name: "Exterior Repairs",
    summary: "Pressure washing, fence and gate repairs, siding and trim, decks, mailbox posts, minor gutter work and other exterior fixes.",
    weDo: ["Pressure washing", "Fence and gate repairs", "Siding, soffit and trim repair", "Deck board and railing repair", "Mailbox posts", "Minor gutter cleaning and repair"],
    weDont: ["Roof replacement", "Foundation repair", "Tree removal", "Concrete pouring"],
  },
  {
    slug: "property-maintenance",
    category: "PROPERTY_MAINTENANCE",
    name: "Property Maintenance",
    summary: "Repeatable repair and punch-list support for landlords, property managers and owners of multiple homes.",
    weDo: ["Turnover and make-ready repairs", "Punch lists, including for home sales", "Recurring maintenance visits", "Photo-based issue intake", "One point of contact across properties"],
    weDont: ["24-hour emergency response", "Major plumbing, electrical or HVAC work", "Lawn care and landscaping", "Cleaning services"],
  },
  {
    slug: "home-improvements",
    category: "HOME_IMPROVEMENTS",
    name: "Home Improvements",
    summary: "Practical upgrades and finish work that improve how a space looks, works and feels without unnecessary complexity.",
    weDo: ["Bathroom refreshes", "Accent walls and feature trim", "Closet and storage systems", "LVP and laminate flooring", "Light fixture and ceiling fan swaps", "Aging-in-place upgrades (grab bars, lever handles)"],
    weDont: ["Additions and new construction", "Projects requiring an architect or engineer", "Full kitchen gut remodels", "Hardwood refinishing and carpet installation"],
  },
];

export const nav = [
  { href: "/services", label: "Services" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/about", label: "About" },
  // Shown only once at least one real review is public (see getNav in src/lib/content.ts).
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
] as const;

export const quoteHref = "/request-a-quote";

/* ─── Homepage copy that the owner may want to reword. ─── */

/** The four promises under "The Hill & Stone Standard". */
export const promises = ["Clear estimates", "Respect for your home", "Professional communication", "Work built to hold up"];

/** "How it works" on the homepage. Titles for steps 1 and 2 are drafts: reword them here. */
export const howItWorks = [
  { title: "Tell us what’s going on.", body: "Send a description and a few photos through the estimate request." },
  { title: "We scope it clearly.", body: "We clarify the job, materials and expectations before work begins." },
  { title: "We do the work.", body: "Our goal is clean execution, respectful service and a finished result." },
  { title: "You move on.", body: "Clear communication, straightforward payment and no loose ends." },
];

/** The property-manager section's list. */
export const propertyManagerServices = [
  "Turnover and punch-list repairs",
  "Recurring maintenance support",
  "Photo-based issue intake",
  "Consolidated communication",
  "Scalable service as your portfolio grows",
];

/** `?type=property-manager` on the estimate form pre-fills its description with this. */
export const propertyManagerPrefill = "I manage rental properties and I’m interested in ongoing maintenance support.";

export const estimateLabel = "Request an Estimate";
