// FAQ content. Answers are plain strings so they also feed the FAQPage structured data.
// TODO(owner): these describe business policies (deposits, trip fee, warranty terms,
// scheduling). Confirm or correct every answer before launch.

import type { SiteConfig } from "@/lib/site";

export type FaqGroup = { slug: string; title: string; items: { q: string; a: string }[] };

export const buildFaq = (site: SiteConfig): FaqGroup[] => [
  {
    slug: "pricing",
    title: "Pricing and estimates",
    items: [
      {
        q: "Do you charge for estimates?",
        a: "No. Quotes from photos are free, and so is the short site visit when a job needs one. You only pay if you approve the work.",
      },
      {
        q: "Can you price a job from photos?",
        a: "Often, yes. Most small repairs can be priced from a few clear photos and a description. If we can't be sure from photos, we'll say so and book a short visit rather than guess.",
      },
      {
        q: "How do you price the work?",
        a: "Every quote is itemized: labor, materials and a trip fee, listed separately. You see exactly what you're paying for before you approve anything.",
      },
      {
        q: "What's the trip fee for?",
        a: "It covers drive time, loading the truck and picking up materials for your job. It's a flat line on the quote, not a surprise on the invoice.",
      },
      {
        q: "What if the job turns out bigger than quoted?",
        a: "Sometimes opening a wall shows rot or damage no one could see. If that happens, we stop, show you what we found, and send a revised quote. We don't do extra work without your approval.",
      },
      {
        q: "Is there a minimum job size?",
        a: "We don't have a minimum, but small jobs are the best value when grouped. If you have a list of fixes, send them together and we'll handle them in one visit.",
      },
    ],
  },
  {
    slug: "scheduling",
    title: "Scheduling and urgent work",
    items: [
      {
        q: "How soon can you start?",
        a: `We reply to every request within ${site.replyWindow}. Start dates depend on the season and the size of the job; your quote shows the next available date.`,
      },
      {
        q: "Do you handle emergencies?",
        a: `We aren't a 24-hour emergency service. For an active leak, shut off the water first, then call ${site.phone}. During business hours we'll fit urgent repairs in as fast as we can.`,
      },
      {
        q: "Do I need to be home while you work?",
        a: "Someone needs to be home to let us in on the first day and to walk the finished job with us. In between, many customers leave us a key or code.",
      },
      {
        q: "What hours do you work?",
        a: `${site.hours}. We give you an arrival window and let you know before it starts if anything changes.`,
      },
      {
        q: "Which areas do you cover?",
        a: "Benton and Washington counties, from Fayetteville to Bella Vista along I-49 and the towns nearby. The service areas page has a ZIP code checker.",
      },
    ],
  },
  {
    slug: "payment",
    title: "Payment and deposits",
    items: [
      {
        q: "How do I pay?",
        a: "You approve your quote online and pay through a secure checkout. We accept Visa, Mastercard, American Express, Discover, Apple Pay and Cash App Pay.",
      },
      {
        q: "Do you require a deposit?",
        a: "Smaller repairs are paid in full when the work is done. Larger projects need a deposit at approval, usually to cover materials we order for your job. The quote shows the deposit amount before you approve.",
      },
      {
        q: "When is the final payment due?",
        a: "After we walk the finished job together and you're satisfied. We send the final invoice with a payment link the same day.",
      },
      {
        q: "Is paying online safe?",
        a: "Yes. Payments are processed by Stripe, a PCI Level 1 certified processor. Your card details go straight to Stripe; we never see or store your full card number.",
      },
    ],
  },
  {
    slug: "warranty",
    title: "Materials and warranty",
    items: [
      {
        q: "Who supplies the materials?",
        a: "We do, in most cases. We buy from local suppliers and list materials on your quote. If you've already bought a fixture or flooring you love, we're happy to install it.",
      },
      {
        q: "Can I choose the materials and finishes?",
        a: "Yes. For anything visible, like paint colors, trim profiles, hardware and flooring, we'll confirm your choice before ordering.",
      },
      {
        q: "What does your warranty cover?",
        a: `Our ${site.warranty} covers our labor: if something we built or repaired fails because of how we did it, we come back and fix it at no charge.`,
      },
      {
        q: "What isn't covered?",
        a: "Manufacturer defects in materials (those fall under the maker's warranty, which we'll help you claim), normal wear, damage from storms or accidents, and materials the customer supplied.",
      },
      {
        q: "How do I make a warranty claim?",
        a: `Call ${site.phone} or reply to any email from us with photos of the problem. We'll set up a visit to look at it.`,
      },
    ],
  },
];
