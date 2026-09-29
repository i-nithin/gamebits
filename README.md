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
| `ADMIN_USER_ID` | Bootstrap | Clerk user id (`user_…`) inserted as the first owner when the staff table is empty |
| `NEXT_PUBLIC_WEB_URL` | Admin app | Public site origin, used for “View on site” links (`http://localhost:3000` locally) |
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
3. After signing in once locally, copy your user id from the Clerk dashboard (Users) into `ADMIN_USER_ID`. That id becomes the owner the first time the admin app starts and the staff table is empty. Later staff are managed in the console.
4. Add `http://localhost:3001` and `https://admin.gamebits.com` to the Clerk application’s allowed origins and redirect URLs.

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

Useful scripts:

| Script | What it does |
|---|---|
| `npm run db:generate` | Generate a new Drizzle migration from `packages/db/src/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_UNPOOLED`) |
| `npm run db:push` | Push schema without a migration file (dev only) |
| `npm run db:seed` | Insert demo games + current-week listings |

## 4. Run

```bash
npm run dev
```

- Public site: [http://localhost:3000](http://localhost:3000)
- Admin console: [http://localhost:3001](http://localhost:3001) (`admin.gamebits.com` in production)

### Smoke checklist

- Homepage shows the weekly board (after seed or after you launch games)
- Sign in via Clerk
- **Add game** (`/games/new`) — logo upload hits R2, then create
- Owner **Launch** (`/games/[slug]/launch`) assigns an ISO week (cap 20)
- Admin console on port 3001 signs in with Clerk and only loads for staff

## Deploy (Vercel)

This repo is an npm + Turborepo workspace. Create **two** Vercel projects from the same Git repository. On each project, enable “Include source files outside of the Root Directory” so `packages/*` is available at build time.

| Project | Root directory | Domain |
|---|---|---|
| Public site | `apps/web` | `gamebits.com` |
| Admin console | `apps/admin` | `admin.gamebits.com` |

DNS: CNAME `admin` to the admin project’s Vercel domain.

1. Set the shared env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, Clerk, R2) on both projects.
2. On the admin project, also set `NEXT_PUBLIC_WEB_URL` to `https://gamebits.com`.
3. In Clerk, add `https://admin.gamebits.com` (and `http://localhost:3001` for local) to allowed origins and redirect URLs. Both apps use the same Clerk application.
4. Add both production origins to the R2 bucket CORS `AllowedOrigins`, plus `http://localhost:3001`.
5. Use Neon’s pooled URL for `DATABASE_URL` and the direct URL for `DATABASE_URL_UNPOOLED`.
6. Run migrations once against production (`npm run db:migrate` with production `DATABASE_URL_UNPOOLED`). The `staff` table and profile suspension column ship in migration `0015_staff_and_suspend`.

## Docs

- Product scope: [`docs/product.md`](docs/product.md)
- Visual system: [`docs/design-system.md`](docs/design-system.md)
- Living architecture notes: [`openmemory.md`](openmemory.md)
