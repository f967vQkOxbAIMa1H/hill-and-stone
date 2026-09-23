# Launch and deploy

## 1. Fill in the business settings

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
| `quoteDefaults` | Starting trip fee, sales tax and deposit in the admin quote builder |

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
- **Stripe**: turn on Cash App Pay under Payment methods. Add the webhook endpoint
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

## Local development

```bash
docker compose up -d   # Postgres on :5433
npm install
npm run db:reset       # local only: wipe, migrate, load sample content, clear ./storage
npm run admin:user -- you@example.com "Name"
npm run dev
```
