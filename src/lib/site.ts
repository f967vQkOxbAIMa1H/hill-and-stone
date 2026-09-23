// Single source of truth for business facts and service content.
import type { ServiceCategory } from "@/generated/prisma/enums";

/* ════════════════════════════════════════════════════════════════════════════
 * BUSINESS SETTINGS: edit this block before launch.
 * `npm run check:launch` lists everything still unset or unconfirmed.
 *
 * Anything set to null is simply left off the site (no brackets, no fake numbers),
 * so the site is presentable at every stage. Fill in values as you have them.
 * ════════════════════════════════════════════════════════════════════════════ */
export const business = {
  name: "Hill & Stone",
  legalName: "Hill & Stone Home Repair LLC",
  tagline: "Reliable Northwest Arkansas home repairs, done right.",

  contact: {
    /** Shown site-wide. The current value is a fictional 555-01xx number: replace it. */
    phone: "(479) 555-0142",
    email: "hello@hillandstone.com",
    hours: "Mon–Fri 7am–6pm, Sat by appointment",
  },

  /** e.g. "0123456" as printed on your Arkansas contractor/home improvement license. */
  license: { label: "Arkansas home improvement license", number: null as string | null },

  /** Rows with a null detail are hidden; the Trust page then offers a certificate on request. */
  insurance: [
    { type: "General liability", detail: null as string | null },
    { type: "Workers' compensation", detail: null as string | null },
    { type: "Commercial auto", detail: null as string | null },
  ],

  warrantyMonths: 12,

  /** Your Google Business Profile review link. Review buttons are hidden until this is set. */
  googleReviewsUrl: null as string | null,

  /** About page story. Each sentence that uses a missing fact is left out. */
  story: {
    founderName: null as string | null, // "Sam Hill"
    foundedYear: null as number | null, // 2019
    hometown: null as string | null, // "Springdale"
    crewSize: null as number | null, // 4
    founderBackground: null as string | null, // "12 years as a finish carpenter for Fayetteville builders"
  },

  /** Photos in /public/images. Missing photos show a brand graphic instead. */
  photos: {
    team: null as string | null, // "/images/team.jpg"
    founder: null as string | null,
    crew: null as string | null,
  },

  policies: {
    replyBusinessDays: 1,
    coiBusinessDays: 2,
    backgroundRecheckYears: 2,
    /** Set to true once you've read the FAQ, Trust page and email wording and they match how you work. */
    confirmed: false,
  },
};

/**
 * Starting values for new quotes in the admin builder.
 * Set `confirmed: true` once these match how you price (check sales tax with your accountant).
 */
export const quoteDefaults = {
  tripFee: "75",
  taxRatePercent: "9.75",
  validDays: 30,
  depositPercent: "50",
  confirmed: false,
};

/* ─── Derived values used by the site. You shouldn't need to edit below here. ─── */

const digits = business.contact.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const insured = business.insurance.filter((i): i is { type: string; detail: string } => !!i.detail);

/** True while the phone is still the fictional 555-01xx placeholder. */
export const phoneIsPlaceholder = /555-?01\d\d$/.test(business.contact.phone.replace(/[^\d-]/g, ""));

export const businessDays = (n: number) => (n === 1 ? "one business day" : n === 2 ? "two business days" : `${n} business days`);

export const site = {
  name: business.name,
  legalName: business.legalName,
  tagline: business.tagline,
  phone: business.contact.phone,
  phoneHref: `tel:+1${digits}`,
  email: business.contact.email,
  hours: business.contact.hours,
  licenseLabel: business.license.label,
  licenseNumber: business.license.number,
  /** Insurance rows that have real details. */
  insurance: insured,
  /** Short line for footers, or null when no details are set. */
  insuranceSummary: insured[0] ? `Insured: ${insured[0].detail} ${insured[0].type.toLowerCase()}` : null,
  warranty: `${business.warrantyMonths % 12 === 0 ? `${business.warrantyMonths / 12}-year` : `${business.warrantyMonths}-month`} workmanship warranty`,
  googleReviewsUrl: business.googleReviewsUrl,
  replyBusinessDays: business.policies.replyBusinessDays,
  replyWindow: businessDays(business.policies.replyBusinessDays),
  coiWindow: businessDays(business.policies.coiBusinessDays),
  backgroundRecheckYears: business.policies.backgroundRecheckYears,
};

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
  { slug: "fayetteville", name: "Fayetteville", county: "Washington", core: true, zips: ["72701", "72703", "72704"], lat: 36.0626, lng: -94.1574 },
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
  summary: string;
  weDo: string[];
  weDont: string[];
};

export const services: Service[] = [
  {
    slug: "general-repairs",
    category: "GENERAL_REPAIRS",
    name: "General home repairs",
    summary: "The running list of small fixes, handled in one visit instead of five.",
    weDo: ["Sticking doors and drawers", "Loose railings and handrails", "Caulking and weatherstripping", "Minor leak fixes at fixtures", "TV, shelf and art mounting", "Punch lists for home sales"],
    weDont: ["Major plumbing (re-piping, water heaters)", "Electrical panel or new circuit work", "HVAC repair", "Roof replacement"],
  },
  {
    slug: "carpentry-doors-trim",
    category: "CARPENTRY_DOORS_TRIM",
    name: "Carpentry, doors & trim",
    summary: "Finish carpentry that closes cleanly and lines up.",
    weDo: ["Interior and exterior door installs", "Baseboard, casing and crown", "Wainscoting and board-and-batten", "Built-in shelving", "Stair treads and balusters", "Rotten trim replacement"],
    weDont: ["Structural framing or load-bearing walls", "Cabinet manufacturing", "Garage door springs and openers"],
  },
  {
    slug: "drywall-painting",
    category: "DRYWALL_PAINTING",
    name: "Drywall & painting",
    summary: "Patches you can't find afterward, and paint lines you don't have to touch up.",
    weDo: ["Hole and crack patching", "Water-damage drywall replacement", "Texture matching", "Interior painting, room by room", "Trim, door and cabinet painting", "Popcorn ceiling removal"],
    weDont: ["Whole-house new-construction drywall", "Lead paint abatement", "Mold remediation"],
  },
  {
    slug: "flooring-fixtures-hardware",
    category: "FLOORING_FIXTURES_HARDWARE",
    name: "Flooring, fixtures & hardware",
    summary: "The details you touch every day, replaced and set right.",
    weDo: ["LVP and laminate installs", "Tile repair and small tile floors", "Faucet, sink and toilet swaps", "Light fixture and ceiling fan swaps", "Cabinet hardware and hinges", "Transitions and thresholds"],
    weDont: ["Hardwood sanding and refinishing", "Carpet installation", "New electrical or plumbing runs"],
  },
  {
    slug: "exterior-repairs",
    category: "EXTERIOR_REPAIRS",
    name: "Exterior repairs & maintenance",
    summary: "Keeping Ozark weather on the outside of your house.",
    weDo: ["Deck board and railing repair", "Siding and soffit repair", "Fence repair and gates", "Gutter cleaning and minor repair", "Exterior caulk and paint touch-up", "Seasonal maintenance visits"],
    weDont: ["Full roof replacement", "Foundation repair", "Tree removal", "Concrete pouring"],
  },
  {
    slug: "renovations-custom",
    category: "RENOVATIONS_CUSTOM",
    name: "Small renovations & custom projects",
    summary: "Room-sized projects, planned and built by the same crew.",
    weDo: ["Bathroom refreshes", "Laundry and mudroom build-outs", "Accent walls and feature trim", "Closet systems", "Kitchen backsplash", "Aging-in-place upgrades (grab bars, lever handles)"],
    weDont: ["Additions and new construction", "Projects requiring an architect or engineer", "Full kitchen gut remodels"],
  },
];

export const nav = [
  { href: "/services", label: "Services" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/about", label: "About" },
  { href: "/our-work", label: "Our work" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
] as const;

export const quoteHref = "/request-a-quote";
