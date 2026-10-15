# Launch and deploy

## 1. Fill in the business settings

Sign in as an owner and open **Site settings** in the admin; saved values override the defaults below and show on
the site immediately. The table describes the defaults in code.

Everything customer-facing that's specific to Hill & Stone lives in one block at the top of
`src/lib/site.ts`:

| Setting | What it controls |
|---|---|
| `business.contact` | Phone, email and hours shown site-wide |
| `business.license`, `business.insurance` | Footer, Trust page and trust badges. Unset values are hidden. |
| `business.googleReviewsUrl` | "Read our reviews on Google" buttons (hidden until set) |
| `business.story` | Founder name, year, hometown, crew size and background for the About page. Sentences with missing facts are left out. |
| `business.photos` | About page photos in `public/images/`. A brand graphic shows until they're added. |
| `business.policies` | Reply time, certificate turnaround, background-check interval, used across the FAQ, Trust page and emails |
| `quoteDefaults` | Starting trip fee and sales tax in the admin quote builder (no deposits: payment is due on completion) |

Then read `src/lib/faq.ts` and the Trust page (`src/app/(site)/trust/page.tsx`). When the wording matches how you
work, set `business.policies.confirmed = true`. When the quote defaults match your pricing, set
`quoteDefaults.confirmed = true`.

## 2. Check what's left

```bash
npm run check:launch                          # uses .env
npm run check:launch -- --env .env.production # or a production env file
```

It lists blockers (fictional phone number, missing keys, localhost URLs, sample data) and warnings (unset
license, story, photos). It exits non-zero while any blocker remains, so it can gate a deploy.

## 3. Production database

```bash
npm run db:deploy          # prisma migrate deploy: applies migrations, never drops data
npm run admin:user -- you@yourdomain.com "Your Name"
```

Don't run `db:reset` or the seed in production. The seed skips non-local databases unless
`ALLOW_SAMPLE_SEED=1` is set.

If sample or test data ever lands in a real database (from a copied dump, or tests pointed at the wrong URL):

```bash
npm run db:clean-samples          # dry run: shows what would be removed
npm run db:clean-samples -- --yes # removes sample projects, placeholder reviews, @example.com customers and test logins
```

## 4. Services

- **Resend**: verify your sending domain, set `RESEND_API_KEY` and `EMAIL_FROM`.
- **Stripe**: turn on Apple Pay under Payment methods (cards are on by default), and set the Stripe account email
  to the business inbox. Add the webhook endpoint
  `https://<your-domain>/api/webhooks/stripe` with `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and
  `checkout.session.expired`, and set `STRIPE_WEBHOOK_SECRET`.
- **Uploads**: `STORAGE_DRIVER=local` (default) keeps photos in `./storage` and needs a persistent disk.
  On Vercel or other serverless hosts, set `STORAGE_DRIVER=s3` with an S3 or Cloudflare R2 bucket
  (`STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, keys). The bucket stays private; the app serves photos
  through routes that check access. Tested against MinIO (`docker compose --profile test up -d`).
- **Quote expiry**: set `CRON_SECRET`. On Vercel, `vercel.json` runs `/api/cron/expire-quotes` daily. Elsewhere,
  add `npm run quotes:expire` to the server's crontab.
- **Analytics**: set `NEXT_PUBLIC_GA_MEASUREMENT_ID` at build time. Page views never include customers' quote links,
  and the admin isn't tracked. Mark `generate_lead`, `begin_checkout` and `purchase` as key events in GA4.
  Other events: `click_to_call`, `quote_declined`, `coi_request`. If you serve visitors in regions that require
  consent before analytics, add a consent banner first.
- **Rate limiting** is in memory, per server instance. Fine for one instance; move it to Redis if you scale out.

## Netlify

`netlify.toml` builds the Next.js app with Netlify's adapter. On Netlify:

- **Database**: Netlify Database, connected automatically (`src/lib/db.ts` uses it whenever `NETLIFY_DB_URL` is
  present, ignoring `DATABASE_URL`). Migrations are mirrored from `prisma/migrations` into
  `netlify/database/migrations`, which Netlify applies on every deploy: deploy previews get their own database
  branch (a copy of production), production gets them just before publish. Create migrations with
  `npm run db:migrate`, which mirrors them; a unit test fails if the two folders drift. Never run
  `prisma migrate deploy` against Netlify Database, and never edit a deployed migration.
- **Uploads**: set `STORAGE_DRIVER=netlify` (Netlify Blobs). Set `NETLIFY_BLOBS_STORE=uploads-preview` for the
  deploy-preview and branch-deploy contexts so previews don't share production's photos.
- **Quote expiry**: `netlify/functions/expire-quotes.mts` runs daily on the published production deploy. Set
  `CRON_SECRET`.
- **Request size**: functions accept about 4.5 MB per request, so quote requests with several full-size phone
  photos are rejected. Shrink photos in the browser before upload before relying on photo uploads in production.
- **First owner login**: a new database has no users. Run `npm run admin:user` with `DATABASE_URL` set to the
  database's connection string (`netlify database status --show-credentials`).

## Local development

```bash
docker compose up -d   # Postgres on :5433
npm install
npm run db:reset       # local only: wipe, migrate, load sample content, clear ./storage
npm run admin:user -- you@example.com "Name"
npm run dev
```
