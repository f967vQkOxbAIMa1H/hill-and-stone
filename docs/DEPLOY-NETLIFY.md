# Deploying to Netlify

Hill & Stone runs on Netlify with Netlify's built-in Next.js runtime (`@netlify/plugin-nextjs`), Netlify Database
(Postgres) and Netlify Blobs for uploaded photos. The canonical address is **https://www.hillandstonehome.com**;
DNS stays on Cloudflare. `docs/DEPLOY.md` covers the business settings and the launch checklist.

## 1. What's in the repo

| File | Purpose |
|---|---|
| `netlify.toml` | Build command, Node 24 (matches `.nvmrc` and `engines`), the Next.js plugin, and security headers for CDN files. Pages get the same headers from `next.config.ts`; a unit test keeps the two in sync. |
| `netlify/functions/expire-quotes.mts` | Scheduled function, daily at 11:00 UTC. Calls `/api/cron/expire-quotes` with `CRON_SECRET`. |
| `netlify/database/migrations/` | Copies of `prisma/migrations`, applied by Netlify on every deploy. |
| `.env.example` | Every environment variable, with notes. |

## 2. Environment variables

Set these in **Site configuration → Environment variables** (or `netlify env:set NAME value --secret` for the
secret ones). Never paste secrets into the repo or a chat.

| Variable | Value | Secret |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://www.hillandstonehome.com`. Read at build time for canonical tags and the sitemap, so set it before the first build and redeploy after changing it. | |
| `RESEND_API_KEY` | From Resend, after verifying `hillandstonehome.com` | yes |
| `EMAIL_FROM` | `Hill & Stone Home Solutions <quotes@hillandstonehome.com>` | |
| `EMAIL_REPLY_TO` | The public contact email (currently `tdavidsonmanagement@outlook.com`) | |
| `ADMIN_NOTIFICATION_EMAIL` | `tdavidsonmanagement@outlook.com`: new requests, accepted quotes, certificate requests, low ratings | |
| `STRIPE_SECRET_KEY` | `sk_test_…` first, `sk_live_…` at launch | yes |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint below | yes |
| `CRON_SECRET` | `openssl rand -base64 32` | yes |
| `STORAGE_DRIVER` | `netlify` | |
| `NETLIFY_BLOBS_STORE` | `uploads-preview` in the deploy-preview and branch-deploy contexts only | |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional, `G-…`; read at build time | |

Don't set `DATABASE_URL` on Netlify: Netlify Database provides `NETLIFY_DB_URL` and `src/lib/db.ts` uses it
(each deploy preview gets its own database branch). There's no auth secret: sessions are random tokens stored
hashed in the database.

## 3. First deploy, in order

1. **Create the site** from the GitHub repo, production branch `main`, and set the variables above.
2. **Deploy.** Netlify applies the migrations in `netlify/database/migrations` before the deploy is published.
   Don't run `prisma migrate deploy` against Netlify Database. (Only if you ever move to an external Postgres
   such as your own Neon project: set `DATABASE_URL` there and run `npm run db:deploy` before each deploy.)
3. **Seed** (optional, and safe to skip). The production seed adds no sample projects, reviews or logins, and
   site settings need no rows: until the owner saves `/admin/settings/site`, the site uses the defaults in
   `src/lib/site.ts` (phone 870-421-1331, email tdavidsonmanagement@outlook.com, hours, $0 trip fee, 9.75% tax,
   30-day quotes). Run it against production like this:

   ```bash
   DATABASE_URL="<connection string from netlify database status --show-credentials>" npm run db:seed
   ```

   Never set `SEED_DEMO=true` here.
4. **Create the owner login** from your machine, pointed at the production database:

   ```bash
   DATABASE_URL="<connection string from netlify database status --show-credentials>" \
   ADMIN_EMAIL="tdavidsonmanagement@outlook.com" npm run admin:create
   ```

   It prints a one-time password **once** and stores only its hash. Give it to the owner in person or by phone;
   don't save it to a file or send it in plain text. At first sign-in they must choose a new password. To issue a
   new one later, run the same command with `-- --reset`.
5. **Check:** `npm run check:launch -- --env <file with the production values>`.

## 4. Domain

In **Domain management**, add `www.hillandstonehome.com` as the primary domain; Netlify adds the apex and
redirects it to www. In Cloudflare DNS (grey cloud, DNS only): `CNAME www → <site>.netlify.app` and
`CNAME @ → apex-loadbalancer.netlify.com`. Then enable HTTPS. The redirect lives in Netlify's domain settings,
not in `netlify.toml`, so there's no redirect loop.

## 5. Stripe webhook

Add an endpoint at **`https://www.hillandstonehome.com/api/webhooks/stripe`** with these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy. Checkout offers whichever payment methods are
on under **Settings → Payment methods** in the Stripe dashboard (cards, Apple Pay, Google Pay, Cash App Pay), so
changing methods needs no code change. Add `www.hillandstonehome.com` under **Payment method domains**.

## 6. The scheduled function

`expire-quotes` runs daily at 11:00 UTC, on the published production deploy only. To run it by hand:

- **Netlify UI:** Logs & metrics → Functions → `expire-quotes` → **Run now**.
- **Directly:** `curl -H "Authorization: Bearer $CRON_SECRET" https://www.hillandstonehome.com/api/cron/expire-quotes`
- **Locally:** `netlify functions:invoke expire-quotes` while `netlify dev` is running.

It returns JSON with the number of quotes it expired. A 401 means `CRON_SECRET` doesn't match; a 503 means it
isn't set.

## 7. Uploads

`STORAGE_DRIVER=netlify` stores photos in Netlify Blobs; the app serves them through routes that check access,
so no image domain is needed in `next.config.ts`. Functions accept about 4.5 MB per request, which is why photos
are shrunk in the browser before upload.
