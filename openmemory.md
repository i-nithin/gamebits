# OpenMemory Guide

Living project index for GameBits.

## Overview

GameBits is a weekly game discovery board (see `docs/product.md`). Visual language is a near-clone of current OpenSea.io, specified in `docs/design-system.md`.

The Next.js 16 App Router app implements the weekly board plus signed-in game ownership: create/edit/archive, Cloudflare R2 uploads, split game details (media + details/launches/reviews), and one review per user.

## Architecture

- Next.js App Router (`app/`) + `proxy.ts` (Clerk `clerkMiddleware` on Next 16)
- Clerk: Google + email; `ADMIN_USER_ID` gates `/admin` in proxy **and** Server Actions
- Neon Postgres via Drizzle (`db/schema.ts`, pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations)
- ISO week clock in `lib/iso-week.ts` (Monday 00:00 UTC → Sunday 23:59 UTC)
- Outbound: `app/out/[slug]/route.ts` 302 + `after()` click increment
- Cloudflare R2 presigned PUT uploads (`app/api/uploads/r2/route.ts`); public objects via `R2_PUBLIC_URL`
- Game ownership: `games.owner_clerk_user_id`; archive via `archived_at` (excluded from board/search)
- Platforms catalog: `platforms` + `game_platforms`; admin CRUD at `/admin/platforms`; owners multi-select from active rows (name + logo)
- Reviews: `game_reviews` unique per user+game; cursor API `GET /api/games/[slug]/reviews`

## User Defined Namespaces

- [Leave blank - user populates]

## Components

- `components/shell/*` — 56px hover-expand rail on `md+`; mobile hamburger (right of logo) opens a full-screen nav overlay with close; top search pill; sticky footer
- `components/board/*` — hero carousel, rank rail, Discover table, game cards (tag pills were removed from the homepage)
- `components/game/*` — OpenSea item-style detail page; form shell for add/edit/launch (full-width viewport-locked two-column on `sm+`, vertical divider, media column does not scroll, details column scrolls, pill action buttons); logo sits beside the title; media preview fills leftover height with always-visible replace/delete; platforms use a multi-select chip bar with catalog logos; field labels include info tooltips
- `components/game/platform-chip.tsx` — shared name+logo chip for board, detail, launch, and editor
- `lib/game-draft.ts` — versioned localStorage add-game draft + upload URL cache
- `lib/image-upload.ts` — R2 upload with in-flight and fingerprint cache reuse
- `components/search/*` — `/` command palette over listed games
- `components/admin/game-form.tsx` — ISO week assignment only (cap 20); create/edit reuses `GameEditor`

## Patterns

- Dark-only tokens in `app/globals.css` (`void` / `obsidian` / `charcoal` / Ice Signal)
- Homepage canvas is Charcoal (`#1b1d1f`); Void is left-rail only. Ambient glow is a blurred, scaled copy of the active hero cover behind the board (CSS blur, no pixel sampling)
- Hero carousel is OpenSea-style: 21:9 banner, light bottom scrim, glass stats, 3 preview tiles, dashes under the banner, 6s autoplay; `heroIndex` is owned by `HomeBoard` so glow and banner stay in sync
- Ranking = vote count for that ISO week; freeze by rejecting votes after the week ends
- One vote per Clerk user per game per campaign week (`votes_user_game_week_idx`)
- Public ranking never includes outbound clicks (admin-only)
- shadcn Base UI primitives; custom chrome follows the design spec, not generic marketing cards
- Owner create/edit at `/games/new` and `/games/[slug]/edit`; launch at `/games/[slug]/launch` (owner/admin week assign); media cap 8; images via Cloudflare R2; videos YouTube/Vimeo HTTPS only; `withVideosFirst` so trailers lead in picker, gallery, and persisted `sort_order`; paste a video URL to fetch its thumbnail
- Add-game drafts persist to `localStorage` key `gamebits:add-game:v1` (cleared on successful create); image uploads are fingerprint-cached in `gamebits:uploads:v1` so the same file is not re-uploaded; logo/media pickers show overlay spinners and block submit while uploading
- Store URLs stored in `game_links` with per-kind hostname allowlists
- Platform catalog is admin-curated; store/social link kinds stay hardcoded because of hostname allowlists
- One review per Clerk user per game (upsert); load 10 then scroll
- Interactive chrome: `a`, `button`, and `[role="button"]` use `cursor: pointer` globally in `app/globals.css` (Tailwind preflight otherwise sets buttons to `cursor: default`)
