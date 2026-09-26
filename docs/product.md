# GameBits MVP

Discovery platform for games: a weekly campaign board (ScrollLaunch’s mechanism, games-only). Not “what physically released this calendar week.”

**Status:** Core weekly board is shipped. Signed-in users can now add/own games, archive them, and post star+comment reviews. Owner Launch is still a stub.

## Problem (MVP slice)

Players cannot find interesting games in one place. Developers cannot get a fair, time-boxed moment of attention. GameBits answers: **what interesting games should I look at this week?**

## Who we serve in MVP

| Role | In MVP? | What they do |
|------|---------|----------------|
| Players | Yes | Browse the week, sign in, upvote, click out to the game |
| You (admin / curator) | Yes | Seed ~20 games per ISO week |
| Developers | Self-serve add | Signed-in users create a game they own; admin still assigns weekly launches |
| Creators | Browse only | Same as players |

Cold start: **you seed and curate the first weeks.** Open developer submit, apply-to-launch, and Premium slot-skip are out of MVP.

## Core mechanism (copy ScrollLaunch, not Product Hunt)

A **GameBits Launch** is a **weekly campaign slot**.

- A game is scheduled onto a specific ISO week’s board of ~20 titles.
- Real-world status can be: released, upcoming, early access, demo, playtest, or unreleased — as long as there is enough information to discover it.
- “This week” means **on this week’s board**, not **shipped this week**.

**Clock:** ISO week, Monday 00:00 UTC → Sunday 23:59 UTC. Archives: `/week/[year]/[week]` (ISO week number).

**Ranking:** Upvote count during that campaign week. **1 vote per signed-in user per game.**

**Freeze:** When the week ends, that week’s rank is frozen. The game page stays. Upvotes no longer change that week’s leaderboard (button disabled, or votes ignored for that week).

## Public surfaces (only these)

1. **Homepage** — current ISO week, ranked list of that week’s ~20 games.
2. **`/week/[year]/[week]`** — frozen (or live, if current) leaderboard for that week.
3. **`/games/[slug]`** — permanent game page (media gallery, details/launches/reviews).
4. **`/games/new`** and **`/games/[slug]/edit`** — signed-in create/edit (owner or admin).

Out of MVP: Today’s Hunts, Trending, New, Upcoming, Popular, Hidden Gems, Categories, Platforms as separate products, `/games` directory, follows, saves, streaks, personalized feeds, similar games, paid launch tiers, SEO badge/dofollow marketplace. Owner launch onto the board is stubbed.

## Player loop

1. Guest opens GameBits → sees this week’s ranked 20.
2. Understands a game from the card (seconds).
3. Optional: opens `/games/[slug]`.
4. Sign in (Clerk: Google + email) to upvote.
5. Primary outbound click is tracked (redirect + counter). Destination is the game’s real site/store.

Later: comments, follows, saves, streaks, richer ranking.

## Game profile (lean)

**Card:** cover, name, tagline, real-world status, 1–3 tags, platforms, rank, vote count.

**Page:** split media/details layout, store links, launches history, reviews (1–5 stars + comment, one per user).

Not in MVP: price, system requirements, markdown essays, maker credits, related games.

## Admin

- Signed-in users add games they own. Owners can edit and archive/unarchive.
- Archived games are hidden from the board and search.
- You (admin) still assign games to an ISO week (cap ~20 per week for scannability).
- Admin also curates the platforms catalog (name + logo). Game submitters pick from that list; they cannot invent platforms.
- Admin = your Clerk user id (`ADMIN_USER_ID`).
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

A stranger can open the homepage, scan 20 interesting games, understand one, upvote if signed in, and leave to the store/site. You can fill next week in admin without a developer portal.
