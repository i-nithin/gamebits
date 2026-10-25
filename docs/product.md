# GameBits MVP

Discovery platform for games: a weekly campaign board (ScrollLaunch’s mechanism, games-only). Not “what physically released this calendar week.”

**Status:** The weekly board is shipped. Signed-in users add and own games, archive them, launch them onto an ISO week, and post star-and-comment reviews. Follows, bookmarks, likes, Adbits, and analytics are shipped.

## Problem (MVP slice)

Players cannot find interesting games in one place. Developers cannot get a fair, time-boxed moment of attention. GameBits answers: **what interesting games should I look at this week?**

## Who we serve in MVP

| Role | In MVP? | What they do |
|------|---------|----------------|
| Players | Yes | Browse the week, sign in, upvote, click out to the game |
| You (admin / curator) | Yes | Seed ~20 games per ISO week |
| Developers | Self-serve add | Signed-in users create a game they own and launch it onto an ISO week |
| Creators | Browse only | Same as players |

Cold start: seed and curate the first weeks. Owners can add a game and launch it. Apply-to-launch and Premium slot-skip are out of MVP.

## Core mechanism (copy ScrollLaunch, not Product Hunt)

A **GameBits Launch** is a **weekly campaign slot**.

- A game is scheduled onto a specific ISO week’s board of ~20 titles.
- Real-world status can be: released, upcoming, early access, demo, playtest, or unreleased — as long as there is enough information to discover it.
- “This week” means **on this week’s board**, not **shipped this week**.

**Clock:** ISO week, Monday 00:00 UTC → Sunday 23:59 UTC. Archives: `/week/[year]/[week]` (ISO week number).

**Ranking:** Upvote count during that campaign week sets the rank. **1 vote per signed-in user per game per launch.** After the week ends, people can still vote and unvote. Those later votes change the running total, not the rank.

**Freeze:** When the week ends, that week’s rank is snapshotted from votes that were still active at week close. The game page stays, and voting stays open. The leaderboard order does not change.

## Public surfaces (only these)

1. **Homepage** — current ISO week, ranked list of that week’s ~20 games.
2. **`/week/[year]/[week]`** — leaderboard for that week. The current week is live. A past week keeps its snapshotted rank, and votes stay open.
3. **`/games/[slug]`** — permanent game page (media gallery, details/launches/reviews).
4. **`/games/new`** and **`/games/[slug]/edit`** — signed-in create/edit (owner or admin).

Also shipped: follows, bookmarks, likes, owner launch at `/games/[slug]/launch`, Adbits, and per-game analytics.

Out of MVP: Today’s Hunts, Trending, New, Upcoming, Popular, Hidden Gems, Categories, Platforms as separate products, `/games` directory, streaks, personalized feeds, similar games, paid launch tiers, SEO badge/dofollow marketplace.

## Player loop

1. Guest opens GameBits → sees this week’s ranked 20.
2. Understands a game from the card (seconds).
3. Optional: opens `/games/[slug]`.
4. Sign in (Clerk: Google + email) to upvote.
5. Primary outbound click is tracked (redirect + counter). Destination is the game’s real site/store.
6. After sign-in: review, follow, bookmark, and like.

Later: streaks and richer ranking.

## Game profile (lean)

**Card:** cover, name, tagline, real-world status, 1–3 tags, platforms, rank, vote count.

**Page:** split media/details layout, store links, launches history, reviews (1–5 stars + comment, one per user).

Not in MVP: price, system requirements, markdown essays, maker credits, related games.

## Admin

- Signed-in users add games they own. Owners can edit and archive/unarchive.
- Archived games are hidden from the board and search.
- Owners launch a game onto an ISO week (cap 20). Admins can do the same.
- Admin also curates the platforms catalog (name + logo). Game submitters pick from that list; they cannot invent platforms.
- Admin = `profiles.super_admin`. The dashboard is `/4dm1n`; anyone else gets a 404.
- Click counts are for admin insight; public ranking is votes only.

## Stack (MVP)

- Next.js app (existing repo)
- Clerk (Google + email) for player identity and admin gate
- Neon Postgres: games, week assignments, votes, outbound click counts
- Outbound: tracked redirect (e.g. `/out/[slug]`), then 302 to primary URL

## Explicit non-goals (this slice)

- Copying ScrollLaunch’s SEO/backlink/badge/Premium economics as the maker incentive
- Daily Product Hunt reset
- Tying board membership to real release dates
- Unlimited uncurated submissions
- Guest/IP votes
- Lifetime vote ranking presented as the weekly board (unless snapshotted — we freeze instead)

## Success for this slice

A stranger can open the homepage, scan 20 interesting games, understand one, upvote if signed in, and leave to the store/site. An owner can launch their game onto a week from the game page.
