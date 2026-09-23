# Hill & Stone

Website, quote requests, quote approval/payment portal and admin CRM for Hill & Stone, a Northwest Arkansas home repair company.

Stack: Next.js 16 (App Router), Tailwind CSS 4, Prisma 7 + PostgreSQL, zod.

## Setup

```bash
cp .env.example .env     # then fill in keys as phases need them
npm install              # also generates the Prisma client
npm run db:up            # local Postgres on :5433 via Docker
npm run db:reset         # migrate + sample content (local only)
npm run dev
```

Design system preview: http://localhost:3000/design-system

## Before launch

All Hill & Stone details (phone, license, insurance, story, policies, quote defaults) are in the
`business` block at the top of `src/lib/site.ts`. Run `npm run check:launch` to see what's left, and
follow [docs/DEPLOY.md](docs/DEPLOY.md) to deploy.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run check:launch` | Lists unset business details, missing env keys and leftover sample data |
| `npm run db:reset` | Local only: wipe the database and `./storage`, migrate, load sample content |
| `npm run db:clean-samples` | Remove sample/test data from any database (dry run unless `-- --yes`) |
| `npm run db:deploy` | Apply migrations in production |
| `npm run admin:user -- email "Name"` | Create or reset an admin login |
| `npm run quotes:sample` | Create sample quotes in every state (dev) |
| `npm run quotes:expire` | Mark overdue quotes expired (calls the cron route; needs `CRON_SECRET`) |

## Where things live

- `docs/DESIGN.md`: design rules (color, contrast, type, layout). Read before building UI.
- `src/app/globals.css`: design tokens
- `src/components/ui/`: base components (button, field, badge, heading, before/after slider)
- `src/lib/site.ts`: business facts, services, service areas
- `src/lib/money.ts`: cents-based quote math
- `prisma/schema.prisma`: leads, quotes, payments, emails, conversions, portfolio, careers

## Quotes and payments

Customers approve quotes at `/quote/<token>`. The token is 32 random bytes; the database id is never exposed.

- `npm run quotes:sample` creates sample quotes in every state (open, expired, deposit paid, paid, declined, withdrawn) and prints their links.
- Payments use Stripe Checkout (hosted). Card covers Visa, Mastercard, American Express and Discover; Apple Pay and Google Pay appear automatically on supported devices; Cash App Pay is enabled explicitly.

### Stripe setup

1. Put your test keys in `.env`: `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. In the Stripe Dashboard, turn on **Cash App Pay** under Payment methods.
3. Webhook endpoint: `https://<your-domain>/api/webhooks/stripe`, subscribed to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed` and `checkout.session.expired`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Locally, forward events with the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, then use the `whsec_...` it prints.

## Admin (`/admin`)

Create a login (prompts for a password, 12+ characters):

```bash
npm run admin:user -- owner@hillandstone.com "Owner Name"
```

- **Overview**: incoming requests, quote acceptance rate, revenue collected, quotes awaiting a response.
- **Requests**: filter by status (pending review → quote sent → accepted/declined → completed), search, open a request to see contact details, budget, description, photos and notes.
- **Quote builder**: line items (labor, materials, trip fee, discounts), sales tax, deposit as a percent or fixed amount, scope and "not included". Totals are recomputed on the server. Sending generates a fresh private link, marks the quote Sent and emails the client.
- **Quote page**: copy link, open the client view, resend, void, request the balance once the job is done, payments and the full history (sent, viewed, deposit paid, balance requested, declined).
- **Portfolio**: add projects with before/after photos; publish and feature them on Our Work and the home page.
- **Reviews**: add customer reviews (publishing requires confirming the customer's permission), link them to projects.

Sessions are stored in the database (only a hash of the cookie), expire after 14 days, and are cleared when the password changes. Starting values for new quotes (trip fee, tax rate, deposit) live in `quoteDefaults` in `src/lib/site.ts`.

## Tests

```bash
npm test                 # unit tests (Vitest)
npm run test:e2e         # site smoke test in headless Firefox (app running)
npm run test:e2e:quote   # quote portal + payments against stripe-mock (see the script header)
npm run test:e2e:admin   # admin sign-in, requests, quote builder, send, lifecycle (same setup)
npm run test:e2e:content # SEO files, 404, portfolio/reviews admin, balance requests, expiry job, GA4 privacy
```
