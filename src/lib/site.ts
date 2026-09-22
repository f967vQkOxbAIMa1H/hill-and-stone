// Single source of truth for business facts and service content.
// TODO(owner): replace placeholder phone, license and insurance details before launch.

import type { ServiceCategory } from "@/generated/prisma/enums";

export const site = {
  name: "Hill & Stone",
  legalName: "Hill & Stone Home Repair LLC",
  tagline: "Reliable Northwest Arkansas home repairs, done right.",
  phone: "(479) 555-0142", // placeholder (555-01xx is reserved for fiction)
  phoneHref: "tel:+14795550142",
  email: "hello@hillandstone.com",
  hours: "Mon–Fri 7am–6pm, Sat by appointment",
  licenseNumber: "AR-HI-000000", // placeholder
  insuredAmount: "$2M general liability", // placeholder
  warranty: "1-year workmanship warranty",
  googleReviewsUrl: "https://g.page/r/placeholder/review", // placeholder
  /** TODO(owner): replace with the real policy details from your certificate of insurance. */
  insurance: [
    { type: "General liability", detail: "$2,000,000 aggregate" },
    { type: "Workers' compensation", detail: "[Carrier and policy status]" },
    { type: "Commercial auto", detail: "[Coverage amount]" },
  ],
  /** Business days to reply to a quote request. TODO(owner): confirm. */
  replyBusinessDays: 1,
} as const;

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

/**
 * Starting values for new quotes in the admin builder.
 * TODO(owner): confirm the trip fee, and confirm the sales tax rate and what's taxable with your accountant.
 */
export const quoteDefaults = {
  tripFee: "75",
  taxRatePercent: "9.75",
  validDays: 30,
  depositPercent: "50",
};

export const nav = [
  { href: "/services", label: "Services" },
  { href: "/service-areas", label: "Service areas" },
  { href: "/about", label: "About" },
  { href: "/our-work", label: "Our work" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
] as const;

export const quoteHref = "/request-a-quote";
