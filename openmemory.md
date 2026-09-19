# OpenMemory Guide

Living project index for GameBits.

## Overview

GameBits is a weekly game discovery board (see `docs/product.md`). Visual language is a near-clone of current OpenSea.io, specified in `docs/design-system.md`.

The Next.js 16 App Router app now implements the locked MVP: dark OpenSea-style shell, Neon/Drizzle data, Clerk (when keys are set), weekly board, game pages, votes, tracked outbound, and Clerk-gated admin.

## Architecture

- Next.js App Router (`app/`) + `proxy.ts` (Clerk `clerkMiddleware` on Next 16)
- Clerk: Google + email; `ADMIN_USER_ID` gates `/admin` in proxy **and** Server Actions
- Neon Postgres via Drizzle (`db/schema.ts`, pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations)
- ISO week clock in `lib/iso-week.ts` (Monday 00:00 UTC → Sunday 23:59 UTC)
- Outbound: `app/out/[slug]/route.ts` 302 + `after()` click increment

## User Defined Namespaces

- [Leave blank - user populates]

## Components

- `components/shell/*` — 56px hover-expand rail on `md+`; mobile hamburger (right of logo) opens a full-screen nav overlay with close; top search pill; sticky footer
- `components/board/*` — hero carousel, rank rail, Discover table, game cards (tag pills were removed from the homepage)
- `components/game/*` — detail page, vote button
- `components/search/*` — `/` command palette over listed games
- `components/admin/game-form.tsx` — create/edit game + ISO week assignment (cap 20)

## Patterns

- Dark-only tokens in `app/globals.css` (`void` / `obsidian` / `charcoal` / Ice Signal)
- Homepage canvas is Charcoal (`#1b1d1f`); Void is left-rail only. Ambient glow is a blurred, scaled copy of the active hero cover behind the board (CSS blur, no pixel sampling)
- Hero carousel is OpenSea-style: 21:9 banner, light bottom scrim, glass stats, 3 preview tiles, dashes under the banner, 6s autoplay; `heroIndex` is owned by `HomeBoard` so glow and banner stay in sync
- Ranking = vote count for that ISO week; freeze by rejecting votes after the week ends
- One vote per Clerk user per game per campaign week (`votes_user_game_week_idx`)
- Public ranking never includes outbound clicks (admin-only)
- shadcn Base UI primitives; custom chrome follows the design spec, not generic marketing cards
