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
| `DATABASE_URL_UNPOOLED` | Yes | Neon **direct** connection string (migrations + seed) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes* | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes* | Clerk secret key |
| `CLOUDFLARE_ACCOUNT_ID` | For uploads | Cloudflare account id (R2 S3 endpoint) |
| `R2_ACCESS_KEY_ID` | For uploads | R2 API token access key id |
| `R2_SECRET_ACCESS_KEY` | For uploads | R2 API token secret access key |
| `R2_BUCKET_NAME` | For uploads | R2 bucket name |
| `R2_PUBLIC_URL` | For uploads | Public base URL for objects (no trailing slash) |

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

Accepted upload types: JPEG, PNG, WebP, GIF · max 8 MB · up to 8 media items per game. Videos are YouTube/Vimeo links only (not file uploads).

Restart `next dev` after changing `R2_PUBLIC_URL` so `next.config` picks up the hostname for `next/image`.

## 3. Database

Apply migrations, then optionally seed sample games for the current ISO week:

```bash
npm run db:migrate
npm run db:seed
```

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
2. Set the same env vars (including R2) in the Vercel project settings. There is no admin env var.
3. Use Neon’s pooled URL for `DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`.
4. Add your production origin to the R2 bucket CORS `AllowedOrigins`.
5. Run migrations against production (`npm run db:migrate` with production `DATABASE_URL_UNPOOLED`), or wire a migrate step into your deploy pipeline. The migration adds `profiles.super_admin`. On a new production database, sign in once, then promote your profile with the SQL in the Admin section above.

## Docs

- Product scope: [`docs/product.md`](docs/product.md)
- Visual system: [`docs/design-system.md`](docs/design-system.md)
- Living architecture notes: [`openmemory.md`](openmemory.md)
