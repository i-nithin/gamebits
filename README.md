# GameBits

Weekly game discovery board (Next.js 16, Clerk, Neon Postgres, Cloudflare R2).

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Clerk](https://clerk.com) application (Google + email)
- A [Cloudflare](https://dash.cloudflare.com) account with **R2** enabled (for logo/screenshot uploads)

## 1. Install

```bash
npm install
```

## 2. Environment

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon **pooled** connection string (app queries) |
| `DATABASE_URL_UNPOOLED` | Yes | Neon **direct** connection string (migrations and seed scripts) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes* | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes* | Clerk secret key |
| `CLOUDFLARE_ACCOUNT_ID` | For uploads | Cloudflare account id (R2 S3 endpoint) |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token access key id |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API token secret access key |
| `R2_BUCKET_NAME` | For uploads | R2 bucket name |
| `R2_PUBLIC_URL` | For uploads | Public base URL for objects (no trailing slash) |
| `CRON_SECRET` | Production | Bearer token for the account-purge, unpaid-ad checkout, and trend-recompute jobs |
| `CRON_BASE_URL` | Optional | Origin the Render cron ping uses. Falls back to `NEXT_PUBLIC_APP_URL` |
| `DODO_PAYMENTS_API_KEY` | For ad checkout | Dodo API key (`dodo_test_…` or `dodo_live_…`) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | For ad checkout | Signing secret from the Dodo webhook endpoint |
| `DODO_PAYMENTS_ENVIRONMENT` | For ad checkout | `test_mode` or `live_mode`. Anything else, including unset, stays in test mode |
| `NEXT_PUBLIC_APP_URL` | Production | Public site origin with no trailing slash. Checkout return URLs use this. Outside localhost the app refuses to build a return URL from the request host |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash Redis REST URL for rate limits on search, uploads, page views, and outbound clicks |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash Redis REST token. Both Upstash variables are required together in production. Leave them unset locally to skip the limit |

\*Without Clerk keys the app still boots, but sign-in, add-game, and votes are unavailable.

### Neon

1. Create a project in the Neon console.
2. Copy both connection strings:
   - Pooled → `DATABASE_URL` (hostname usually contains `-pooler`)
   - Direct → `DATABASE_URL_UNPOOLED`
3. Prefer `sslmode=require` (or Neon’s default SSL settings).

### Clerk

1. Create an application with **Google** and **Email** sign-in.
2. Add keys from the Clerk dashboard to `.env.local`.

### Dodo Payments

Adbits bookings charge through Dodo Checkout. The right rail is $99 per slot and the carousel is $299. A booking is approved only after a verified `payment.succeeded` webhook. The browser return to `/adbits?checkout=return` does not mark the booking paid.

Webhook URL to register in the Dodo dashboard (**Developer → Webhooks → Create Webhook**):

```text
https://YOUR_PRODUCTION_DOMAIN/api/webhooks/dodo
```

Subscribe that endpoint to:

- `payment.succeeded`
- `payment.failed`
- `payment.cancelled`
- `refund.succeeded`

Then:

1. Create a test-mode API key and set `DODO_PAYMENTS_API_KEY` to the `dodo_test_…` value.
2. Leave `DODO_PAYMENTS_ENVIRONMENT` unset, or set it to `test_mode`. Set `live_mode` only for the production key (`dodo_live_…`). Test and live each need their own webhook endpoint and signing secret.
3. Copy the endpoint’s signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`.
4. Set `NEXT_PUBLIC_APP_URL` to the public origin, for example `https://YOUR_PRODUCTION_DOMAIN`, with no trailing slash. This is required outside localhost.
5. Run `npm run db:migrate` so `ad_orders` has the payment columns and `dodo_webhook_events` exists.

Dodo cannot call `http://localhost:3000`. For a local webhook test, expose the dev server with an HTTPS tunnel and register `https://YOUR_TUNNEL_HOST/api/webhooks/dodo` on the **test** webhook endpoint. Use the test signing secret in `.env.local`.

Unpaid checkouts hold their slots for 24 hours. `vercel.json` calls `GET /api/cron/expire-ad-checkouts` every hour with the same `Authorization: Bearer $CRON_SECRET` check as the account-purge job.

### Account deletion

Settings includes **Delete account**. The profile is hidden immediately. The same Clerk login can sign back in and restore the account for 30 days. After that, a daily job deletes the Clerk user and replaces the profile with a tombstone: the handle becomes `deleted_…`, the name becomes “Deleted user”, and the email, images, location, bio, and social links are cleared. Review text and ratings stay, with the display name and avatar cleared. Games and ad bookings stay on that tombstone.

The job is `GET /api/cron/purge-accounts`, scheduled in `vercel.json` at 04:00 UTC. It accepts only `Authorization: Bearer $CRON_SECRET`.

1. Generate a long random secret, for example `openssl rand -base64 32`.
2. Set `CRON_SECRET` in the Vercel project. Vercel sends that value as the bearer token on the cron request.
3. Leave it unset locally. The route returns 401 without the header, and `npm run dev` does not run the schedule. If someone signs in after the 30 days and the job has not run, that visit still closes the login.

### Cloudflare R2

Uploads use **presigned PUT URLs**: the browser uploads the file directly to R2; Next.js only mints a short-lived URL and stores the resulting public object URL on the game.

1. In the Cloudflare dashboard, open **R2 Object Storage** and create a bucket (e.g. `gamebits-media`). Copy the name into `R2_BUCKET_NAME`.
2. **Account ID** — Overview sidebar → copy into `CLOUDFLARE_ACCOUNT_ID`.
3. **Public access** — on the bucket, enable a public URL:
   - **R2.dev subdomain** (quick): Settings → Public access → Allow Access → copy the `https://pub-….r2.dev` URL into `R2_PUBLIC_URL`, **or**
   - **Custom domain**: Connect a domain under the bucket’s Custom Domains, then set `R2_PUBLIC_URL` to `https://your-images-domain` (no trailing slash).
4. **API token** — R2 → Overview → **Manage R2 API Tokens** → Create API token:
   - Permissions: **Object Read & Write** (scoped to your bucket, or account-wide for local/dev)
   - Copy **Access Key ID** → `R2_ACCESS_KEY_ID`
   - Copy **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (do not commit it)
5. **CORS** — on the bucket, add a CORS policy so the browser can PUT from your app origins. Example:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR_PRODUCTION_DOMAIN"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without the five R2-related vars, `/api/uploads/r2` returns `503` and logo/media upload on Add Game will fail until they are set.

Accepted upload types: JPEG, PNG, WebP, GIF · max 8 MB · up to 8 media items per game. The upload route requires `contentLength` and rejects anything over the cap before it signs the PUT. After the file lands, the server reads the first bytes and deletes the object unless they match that type. Videos on a game page are YouTube/Vimeo links only. Adbits clips are a separate upload with their own size cap.

Search is limited to 30 requests a minute per IP, uploads to 20 a minute per signed-in user, page views to 30 a minute per IP, and outbound click counting to 60 a minute per IP. Over the click limit the redirect still happens and the click is not counted. In production those limits fail closed when the Upstash variables are missing.

Restart `next dev` after changing `R2_PUBLIC_URL` so `next.config` picks up the hostname for `next/image`.

## 3. Database

Apply migrations, then optionally load demo data:

```bash
npm run db:migrate
npm run db:seed
npm run db:seed:analytics
```

`db:seed` inserts the sample catalog (Northstar Drift and the other fictional games) and lists them on the current ISO week. Skip it when the database already has games uploaded from real accounts.

`db:seed:analytics` fills every live game already in the database with 60 days of demo activity: views, unique visitors, link clicks, countries, upvotes, likes, bookmarks, and written reviews. It also lists each of those games on the last four ISO weeks so launch stats show up. Featured flags already on a listing are left as they are.

Run it again any time the team adds games. A re-run rebuilds the demo series for every non-archived game. Reviews, likes, votes, and bookmarks from real accounts stay. Demo rows use accounts whose ids start with `seed:` and are replaced on the next run. The previous view and click rollup for those games is replaced too, including any real traffic recorded since the last run.

### Admin

Admin access is a database flag, not an environment variable. A signed-in user is an admin only when `profiles.super_admin` is true. The dashboard is [`/4dm1n`](http://localhost:3000/4dm1n). Everyone else, including signed-out visitors, gets the not-found page. The Admin item in the sidebar appears only for super admins.

1. Sign in once locally so a `profiles` row exists for your Clerk user.
2. Run `npm run db:migrate`. That adds `super_admin` and promotes the original operator if that profile is already in the database.
3. On a fresh database, promote your own profile after you have signed in. Copy your user id from the Clerk dashboard (Users), then run this against the direct database URL:

```sql
UPDATE profiles SET super_admin = true WHERE clerk_user_id = 'user_…';
```

4. After that, super admins grant or revoke access from `/4dm1n` (Users). The last remaining admin cannot be revoked.

Useful scripts:

| Script | What it does |
|---|---|
| `npm run db:generate` | Generate a new Drizzle migration from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_UNPOOLED`) |
| `npm run db:push` | Push schema without a migration file (dev only) |
| `npm run db:seed` | Insert demo games + current-week listings |
| `npm run db:seed:analytics` | Demo views, countries, clicks, votes, likes, bookmarks, and reviews for every live game |

## 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Smoke checklist

- Homepage shows the weekly board (after seed or after you launch games)
- Sign in via Clerk
- **Add game** (`/games/new`) — logo upload hits R2, then create
- Owner **Launch** (`/games/[slug]/launch`) assigns an ISO week (cap 20)
- `/4dm1n` opens the admin directory when your profile is a super admin
- Anyone else who opens `/4dm1n` sees Not found
- **Settings** stays at `/settings`

## Deploy (Vercel)

1. Push the repo and import it in Vercel.
2. Set the same env vars (including R2, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, and the Dodo keys) in the Vercel project settings. There is no admin env var. Admin access stays the `profiles.super_admin` flag. Set `DODO_PAYMENTS_ENVIRONMENT=live_mode` only when `DODO_PAYMENTS_API_KEY` is a live key.
3. Use Neon’s pooled URL for `DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`.
4. Add your production origin to the R2 bucket CORS `AllowedOrigins`.
5. Run migrations against production (`npm run db:migrate` with production `DATABASE_URL_UNPOOLED`), or wire a migrate step into your deploy pipeline. On a new production database, sign in once, then promote your profile with the SQL in the Admin section above.
6. Confirm the crons in the Vercel project. `vercel.json` calls `/api/cron/purge-accounts` once a day and `/api/cron/expire-ad-checkouts` every hour. Without `CRON_SECRET`, those requests are rejected: logins past the 30-day window stay open until the person signs in again, and unpaid ad slots stay held until the checkout row is cancelled.
7. In the Dodo dashboard, register `https://YOUR_PRODUCTION_DOMAIN/api/webhooks/dodo` and put that endpoint’s signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`. Checkout and the webhook route both refuse to run when that key is empty.

## Deploy (Render, staging)

[`render.yaml`](render.yaml) is a Blueprint for a paid web service plus the same three cron jobs as `vercel.json`. Production can stay on Vercel. Do not use a free Render instance: a Next.js 16 production build needs more than 512 MB, and a sleeping free service makes the cron `GET`s time out.

1. In Render, create a Blueprint from this repo. Use the `1c-2g` web plan from the file. Fill the prompted secrets (Neon, Clerk, R2, Dodo, Upstash, `NEXT_PUBLIC_APP_URL`). The `gamebits-staging` env group sets `DODO_PAYMENTS_ENVIRONMENT=test_mode` and generates `CRON_SECRET`.
2. Set `NEXT_PUBLIC_APP_URL` and `R2_PUBLIC_URL` **before the first successful build**. Those values are baked into the client bundle and `next/image` remote patterns. After the hostname exists, use `https://gamebits-staging.onrender.com` with no trailing slash, then **Manual Deploy** if the first build used a placeholder.
3. Use a staging Neon branch or a separate Neon project. Pooled URL → `DATABASE_URL`, direct URL → `DATABASE_URL_UNPOOLED`. The web service runs `npm run db:migrate` as a pre-deploy step.
4. In Clerk, add the Render origin to allowed origins and redirect URLs.
5. Add `https://gamebits-staging.onrender.com` to the R2 bucket CORS `AllowedOrigins`.
6. In the Dodo **test** dashboard, register `https://gamebits-staging.onrender.com/api/webhooks/dodo` and put that endpoint’s signing secret in `DODO_PAYMENTS_WEBHOOK_KEY`. Keep `DODO_PAYMENTS_ENVIRONMENT` as `test_mode`.
7. Upstash is required on Render (`NODE_ENV=production`). Without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, search, uploads, and outbound clicks return 503.
8. After the first deploy, sign in once, then promote your profile with the SQL in the Admin section above.
9. On each cron service, open **Runs** and **Trigger Run**. `scripts/render-cron.mjs` `GET`s `/api/cron/purge-accounts` (04:00 UTC daily), `/api/cron/expire-ad-checkouts` (hourly), and `/api/cron/recompute-trends` (every 15 minutes) with `Authorization: Bearer $CRON_SECRET`. A non-2xx exit marks the run failed.

Optional: set `CRON_BASE_URL` on the web service (and copy it onto the cron services) if the jobs should hit a different origin than `NEXT_PUBLIC_APP_URL`.

## Docs

- Product scope: [`docs/product.md`](docs/product.md)
- Trending score: [`docs/trending.md`](docs/trending.md)
- Visual system: [`docs/design-system.md`](docs/design-system.md)
- Living architecture notes: [`openmemory.md`](openmemory.md)
