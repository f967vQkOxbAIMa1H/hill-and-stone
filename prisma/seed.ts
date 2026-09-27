import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ServiceCategory } from "../src/generated/prisma/client";

// Sample content must never reach a real database by accident.
const seedHost = new URL(process.env.DATABASE_URL!).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(seedHost) && process.env.ALLOW_SAMPLE_SEED !== "1") {
  console.log(`Skipping sample seed: ${seedHost} isn't a local database. Set ALLOW_SAMPLE_SEED=1 to override.`);
  process.exit(0);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Development-only sample data. Safe to re-run: sample projects use the "sample-" slug
// prefix and sample reviews use source "seed", and both are replaced on each run.
// Everything here is placeholder content; none of it describes a real job or customer.

type SampleProject = {
  slug: string;
  title: string;
  category: ServiceCategory;
  city: string;
  summary: string;
  scopeOfWork: string;
  results: string;
  materials: string[];
  durationDays: number;
  featured?: boolean;
  image: string;
};

const projects: SampleProject[] = [
  {
    slug: "sample-hallway-water-damage",
    title: "Hallway water-damage repair",
    category: "DRYWALL_PAINTING",
    city: "Rogers",
    summary: "A slow leak from an upstairs bath left a soft, stained section of hallway wall.",
    scopeOfWork: "Cut out damaged drywall, confirm the leak was fixed and the framing dry, hang new board, tape and mud, match the orange-peel texture, prime and paint the full wall, and install new baseboard.",
    results: "The patch is invisible once painted, and the wall was painted corner to corner so there's no color mismatch.",
    materials: ["1/2 in drywall", "Setting compound", "Orange-peel texture", "MDF baseboard", "Satin wall paint"],
    durationDays: 2,
    featured: true,
    image: "wall",
  },
  {
    slug: "sample-front-door-trim",
    title: "Front door trim replacement",
    category: "CARPENTRY_DOORS_TRIM",
    city: "Bentonville",
    summary: "Rot had worked up the bottom of the exterior casing and brickmould on a 1990s front door.",
    scopeOfWork: "Remove rotted brickmould and casing, treat and patch the sill, install PVC brickmould that won't rot, caulk, and paint to match.",
    results: "Clean, tight trim that sheds water, in a material that won't rot again.",
    materials: ["PVC brickmould", "Exterior wood filler", "Polyurethane sealant", "Exterior semi-gloss paint"],
    durationDays: 1,
    image: "door-trim",
  },
  {
    slug: "sample-deck-board-railing",
    title: "Deck board and railing repair",
    category: "EXTERIOR_REPAIRS",
    city: "Fayetteville",
    summary: "Cupped, splitting boards and a wobbly rail section on a back deck.",
    scopeOfWork: "Replace 14 deck boards, re-fasten the rest with coated screws, rebuild one rail section with new posts, then clean and seal the full deck.",
    results: "Solid footing, a rail that doesn't move, and a sealed surface ready for another season.",
    materials: ["Pressure-treated 5/4 decking", "4x4 posts", "Coated deck screws", "Semi-transparent deck stain"],
    durationDays: 3,
    featured: true,
    image: "deck",
  },
  {
    slug: "sample-laundry-floor",
    title: "Laundry room floor",
    category: "FLOORING_FIXTURES_HARDWARE",
    city: "Springdale",
    summary: "Peeling sheet vinyl and a cracked transition in a small laundry room.",
    scopeOfWork: "Pull old vinyl, level the subfloor, install waterproof LVP with new quarter-round and transitions, and reset the washer and dryer.",
    results: "A waterproof floor that sits flush with the hallway.",
    materials: ["Waterproof LVP", "Floor leveler", "Quarter-round", "T-molding transition"],
    durationDays: 1,
    image: "flooring",
  },
  {
    slug: "sample-hall-bath-refresh",
    title: "Hall bath refresh",
    category: "RENOVATIONS_CUSTOM",
    city: "Bella Vista",
    summary: "A dated guest bath with a failing vanity and builder-grade fixtures.",
    scopeOfWork: "Install a new vanity and top, faucet, mirror, light fixture and hardware, patch and paint the walls, and add a grab bar by the tub.",
    results: "A bathroom that feels new without moving any plumbing.",
    materials: ["36 in vanity with quartz top", "Faucet and drain", "LED vanity light", "Grab bar", "Semi-gloss paint"],
    durationDays: 4,
    image: "bath",
  },
  {
    slug: "sample-stair-handrail",
    title: "Stair handrail repair",
    category: "GENERAL_REPAIRS",
    city: "Lowell",
    summary: "A handrail that had pulled loose from the wall on a basement stair.",
    scopeOfWork: "Find the studs, remove the old brackets, install heavy-duty brackets with structural screws, and patch the old holes.",
    results: "A rail that holds full weight, which matters most on basement stairs.",
    materials: ["Heavy-duty rail brackets", "Structural screws", "Spackle", "Touch-up paint"],
    durationDays: 1,
    image: "handrail",
  },
];

async function main() {
  await db.user.upsert({
    where: { email: "owner@hillstone.com" },
    update: {},
    create: { email: "owner@hillstone.com", name: "Owner", role: "OWNER" },
  });

  await db.testimonial.deleteMany({ where: { source: "seed" } });
  await db.project.deleteMany({ where: { slug: { startsWith: "sample-" } } });
  // Remove the Phase 1 sample project that predates the prefix.
  await db.project.deleteMany({ where: { slug: "hallway-water-damage-repair" } });

  const created: Record<string, string> = {};
  for (const [i, p] of projects.entries()) {
    const { image, ...data } = p;
    const project = await db.project.create({
      data: {
        ...data,
        featured: data.featured ?? false,
        published: true,
        completedAt: new Date(Date.UTC(2026, 7 - i, 12)),
        images: {
          create: [
            { storageKey: `/placeholders/before-${image}.svg`, alt: `${p.title}: before`, isBefore: true, pairKey: "main" },
            { storageKey: `/placeholders/after-${image}.svg`, alt: `${p.title}: after`, pairKey: "main", sortOrder: 1 },
          ],
        },
      },
    });
    created[p.slug] = project.id;
  }

  const placeholder =
    "Placeholder review. Replace with a real Google review before launch. This block is sized for two to four sentences about the job, the crew and how it turned out.";
  const short = "Placeholder review. Replace with a real, shorter Google review.";
  const reviews = [
    { city: "Bentonville", body: placeholder, featured: true },
    { city: "Fayetteville", body: placeholder, project: "sample-deck-board-railing" },
    { city: "Rogers", body: short, project: "sample-hallway-water-damage" },
    { city: "Springdale", body: placeholder },
    { city: "Bella Vista", body: placeholder + " Longer reviews wrap onto more lines and the wall still balances.", project: "sample-hall-bath-refresh" },
    { city: "Lowell", body: short },
    { city: "Centerton", body: placeholder },
    { city: "Bentonville", body: short, project: "sample-front-door-trim" },
  ];
  await db.testimonial.createMany({
    data: reviews.map((r, i) => ({
      authorName: "Placeholder name",
      city: r.city,
      body: r.body,
      source: "seed",
      featured: r.featured ?? false,
      projectId: r.project ? created[r.project] : null,
      reviewedAt: new Date(Date.UTC(2026, 8, 20 - i * 9)),
    })),
  });

  console.log(`Seeded ${projects.length} sample projects and ${reviews.length} placeholder reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
