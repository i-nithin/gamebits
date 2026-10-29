import { config } from "dotenv";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";

import { compareIsoWeek, getIsoWeekUtc, isoWeekRangeUtc, shiftIsoWeek } from "../lib/iso-week";
import {
  bookmarks,
  gameAnalyticsClickVisitors,
  gameAnalyticsDaily,
  gameAnalyticsVisitors,
  gameLinks,
  gameReviews,
  games,
  likes,
  votes,
  weekListings,
  type AnalyticsCountryBucket,
} from "./schema";

/**
 * Demo activity for every live game: views, unique visitors, link clicks,
 * countries, upvotes, likes, bookmarks, and written reviews.
 *
 * Re-running rebuilds that demo from scratch for every non-archived game.
 * Rows owned by real accounts are kept. Demo accounts use ids that start
 * with "seed:" and are removed before each run.
 *
 *   npm run db:seed:analytics
 */

config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to seed analytics");
}

const HISTORY_DAYS = 90;
const LAUNCH_WEEKS = 4;
const REVIEWS_PER_GAME = 28;
const VISITOR_POOL = 18000;
const USER_POOL = 4800;
const SEED_USER = "seed:%";
const INSERT_CHUNK = 1500;

const COUNTRIES: Array<{ code: string; weight: number }> = [
  { code: "US", weight: 22 },
  { code: "IN", weight: 14 },
  { code: "BR", weight: 8 },
  { code: "GB", weight: 7 },
  { code: "DE", weight: 6 },
  { code: "JP", weight: 5 },
  { code: "CA", weight: 5 },
  { code: "FR", weight: 4 },
  { code: "ID", weight: 4 },
  { code: "AU", weight: 4 },
  { code: "MX", weight: 3 },
  { code: "KR", weight: 3 },
  { code: "PH", weight: 3 },
  { code: "NG", weight: 2 },
  { code: "ES", weight: 2 },
  { code: "IT", weight: 2 },
  { code: "NL", weight: 2 },
  { code: "PL", weight: 2 },
  { code: "TR", weight: 2 },
  { code: "SE", weight: 2 },
  { code: "AR", weight: 2 },
  { code: "ZA", weight: 1 },
  { code: "CO", weight: 1 },
  { code: "TH", weight: 1 },
  { code: "VN", weight: 1 },
  { code: "EG", weight: 1 },
  { code: "PK", weight: 1 },
  { code: "MY", weight: 1 },
  { code: "UA", weight: 1 },
  { code: "RO", weight: 1 },
  { code: "CL", weight: 1 },
  { code: "BE", weight: 1 },
  { code: "PT", weight: 1 },
  { code: "AE", weight: 1 },
  { code: "SG", weight: 1 },
  { code: "NZ", weight: 1 },
  { code: "IE", weight: 1 },
  { code: "NO", weight: 1 },
  { code: "FI", weight: 1 },
  { code: "KE", weight: 1 },
  { code: "TW", weight: 1 },
  { code: "HK", weight: 1 },
];

const LINK_WEIGHT: Record<string, number> = {
  primary: 46,
  web: 10,
  steam: 14,
  playstore: 12,
  appstore: 12,
  nintendo: 6,
  playstation: 8,
  xbox: 8,
  discord: 5,
  x: 4,
};

const FIRST_NAMES = [
  "Maya",
  "Jonah",
  "Priya",
  "Elena",
  "Omar",
  "Sofia",
  "Kenji",
  "Amira",
  "Luca",
  "Hannah",
  "Diego",
  "Freya",
  "Arjun",
  "Chloe",
  "Mateo",
  "Leila",
  "Noah",
  "Ingrid",
  "Samir",
  "Yuki",
  "Felix",
  "Aisha",
  "Theo",
  "Rosa",
  "Ivan",
  "Nadia",
  "Hugo",
  "Mei",
  "Oscar",
  "Laila",
  "Chris",
  "Anika",
];

const LAST_NAMES = [
  "Okonkwo",
  "Berg",
  "Nakamura",
  "Silva",
  "Rahman",
  "Costa",
  "Petrov",
  "Alvarez",
  "Kim",
  "Rossi",
  "Diallo",
  "Novak",
  "Santos",
  "Meyer",
  "Idris",
  "Cho",
  "Moreau",
  "Hassan",
  "Kowalski",
  "Duarte",
  "Lindgren",
  "Carvalho",
  "Mensah",
  "Park",
];

const REVIEW_TEMPLATES: Array<{ rating: number; body: (name: string) => string }> = [
  {
    rating: 5,
    body: (name) =>
      `${name} is the one I keep coming back to. The first session ran long without me noticing.`,
  },
  {
    rating: 5,
    body: (name) =>
      `Sharp, generous, and easy to show a friend. I already sent ${name} to two people.`,
  },
  {
    rating: 5,
    body: (name) =>
      `The moment-to-moment feel is excellent. I lost an evening to ${name} and would do it again.`,
  },
  {
    rating: 5,
    body: (name) =>
      `Looks great, runs clean, and the hook lands fast. Five stars for ${name} from me.`,
  },
  {
    rating: 5,
    body: (name) =>
      `I came in for a quick look and stayed. ${name} respects your time and still finds room to surprise you.`,
  },
  {
    rating: 5,
    body: (name) =>
      `Played this on a couch with a friend and we both refused to hand the controller back. ${name} is a delight.`,
  },
  {
    rating: 5,
    body: (name) =>
      `The art direction and the pacing line up. ${name} feels finished in the way a lot of games only promise.`,
  },
  {
    rating: 4,
    body: (name) =>
      `Really strong. A couple of menus are fussy, but ${name} is still worth it.`,
  },
  {
    rating: 4,
    body: (name) =>
      `Spent a weekend in ${name}. I want a little more variety late, and I am still recommending it.`,
  },
  {
    rating: 4,
    body: (name) =>
      `Polished and fun. I bounced off one difficulty spike, then ${name} clicked and I was gone.`,
  },
  {
    rating: 4,
    body: (name) =>
      `The presentation of ${name} is lovely and the core loop is sticky. Not perfect. Just very good.`,
  },
  {
    rating: 4,
    body: (name) =>
      `Easy to pick up and hard to put down. A few rough edges, nothing that ruined ${name}.`,
  },
  {
    rating: 4,
    body: (name) =>
      `I like how readable everything is. ${name} teaches you by letting you play, which is the right call.`,
  },
  {
    rating: 4,
    body: (name) =>
      `Came for the screenshots, stayed for the systems. ${name} has more going on than the trailer shows.`,
  },
  {
    rating: 3,
    body: (name) =>
      `Solid idea, and I had fun for a while. ${name} starts repeating itself before I was ready to stop.`,
  },
  {
    rating: 3,
    body: (name) =>
      `Charming and uneven. Some hours of ${name} were great and some felt like padding.`,
  },
  {
    rating: 3,
    body: (name) =>
      `I like the style more than the systems. Worth a look if you are curious about ${name}.`,
  },
  {
    rating: 3,
    body: (name) =>
      `A good ride that runs out of surprises. I finished ${name} glad I tried it, not in a hurry to replay.`,
  },
  {
    rating: 2,
    body: (name) =>
      `I wanted to love ${name}. The opening is promising, then the friction piles up.`,
  },
  {
    rating: 2,
    body: (name) =>
      `Pretty, but I kept fighting the controls more than the game. I might retry ${name} after an update.`,
  },
  {
    rating: 1,
    body: (name) =>
      `I bounced off ${name} pretty quickly. The idea is fine, and the moment-to-moment just did not hold me.`,
  },
];

type Rng = () => number;

type DailyPlan = {
  day: string;
  pageViews: number;
  linkClicks: number;
  clicks: Record<string, number>;
  countries: Record<string, AnalyticsCountryBucket>;
  visitors: number[];
};

type GamePlan = {
  days: DailyPlan[];
  pageViews: number;
  linkClicks: number;
  views7d: number;
  unique7d: number;
  countries: number;
  likes: number[];
  bookmarks: number[];
  reviews: Array<{ userId: number; rating: number; body: string; createdAt: Date }>;
  votes: Array<{ userId: number; isoYear: number; isoWeek: number; createdAt: Date }>;
  listings: Array<{ year: number; week: number }>;
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): Rng {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rng: Rng, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function utcDaysAgo(daysAgo: number, now: Date) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function spread(total: number, weights: number[]) {
  if (weights.length === 0 || total <= 0) return weights.map(() => 0);
  const safe = weights.map((weight) => (weight > 0 ? weight : 1));
  const sum = safe.reduce((totalWeight, weight) => totalWeight + weight, 0);
  const raw = safe.map((weight) => (total * weight) / sum);
  const counts = raw.map((value) => Math.floor(value));
  let leftover = total - counts.reduce((totalCount, count) => totalCount + count, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - counts[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; leftover > 0; index++) {
    counts[order[index % order.length].index] += 1;
    leftover -= 1;
  }
  return counts;
}

function pickWeighted<T extends { weight: number }>(rng: Rng, items: readonly T[], count: number) {
  const pool = items.slice();
  const picked: T[] = [];
  const take = Math.min(count, pool.length);
  for (let i = 0; i < take; i++) {
    let total = 0;
    for (const item of pool) total += item.weight;
    let ticket = rng() * total;
    let index = pool.length - 1;
    for (let cursor = 0; cursor < pool.length; cursor++) {
      ticket -= pool[cursor].weight;
      if (ticket <= 0) {
        index = cursor;
        break;
      }
    }
    const [item] = pool.splice(index, 1);
    picked.push(item);
  }
  return picked;
}

function sampleIds(rng: Rng, count: number, pool: number) {
  const ids = new Set<number>();
  const target = Math.min(count, pool);
  let guard = 0;
  while (ids.size < target && guard < target * 40) {
    ids.add(Math.floor(rng() * pool));
    guard += 1;
  }
  return [...ids];
}

function persona(id: number) {
  const first = FIRST_NAMES[id % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(id / FIRST_NAMES.length) % LAST_NAMES.length];
  return {
    clerkUserId: `seed:u:${String(id).padStart(4, "0")}`,
    displayName: `${first} ${last}`,
  };
}

function visitorKey(id: number) {
  return `seed:v:${String(id).padStart(4, "0")}`;
}

function pickVisitors(rng: Rng, uniqueCount: number, origin: number) {
  const picked = new Set<number>();
  const core = 2400;
  const coreTarget = Math.min(uniqueCount, Math.round(uniqueCount * 0.7));
  let guard = 0;
  while (picked.size < coreTarget && guard < coreTarget * 20) {
    const slot = Math.floor(rng() * core);
    picked.add((origin + slot) % VISITOR_POOL);
    guard += 1;
  }
  guard = 0;
  while (picked.size < uniqueCount && guard < uniqueCount * 30) {
    picked.add(Math.floor(rng() * VISITOR_POOL));
    guard += 1;
  }
  return [...picked];
}

function pastDate(rng: Rng, now: Date) {
  const roll = rng();
  const span = rng();
  const hours = rng() * 20;
  const daysAgo = roll < 0.58 ? span * 13 : 14 + span * (HISTORY_DAYS - 14);
  return new Date(now.getTime() - (daysAgo * 86_400_000 + hours * 3_600_000));
}

function shuffle<T>(rng: Rng, items: readonly T[]) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function buildDailyCounts(rng: Rng, now: Date) {
  const gameScale = 0.82 + rng() * 0.7;
  const clickRate = 0.08 + rng() * 0.07;
  const days: Array<{ day: string; pageViews: number; linkClicks: number }> = [];

  for (let ago = HISTORY_DAYS - 1; ago >= 0; ago--) {
    const date = utcDaysAgo(ago, now);
    const recency = 1 - ago / (HISTORY_DAYS - 1);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6 ? 1.2 : 1;
    const noise = 0.78 + rng() * 0.44;
    const pageViews = Math.max(
      90,
      Math.round((280 + recency * 1100) * gameScale * weekend * noise),
    );
    const linkClicks = Math.min(
      pageViews,
      Math.max(1, Math.round(pageViews * clickRate * (0.85 + rng() * 0.3))),
    );
    days.push({ day: dayString(date), pageViews, linkClicks });
  }

  const lastWeek = days.slice(-7);
  const weekViews = lastWeek.reduce((sum, day) => sum + day.pageViews, 0);
  if (weekViews < 4500) {
    const factor = 4500 / weekViews;
    for (const day of lastWeek) {
      day.pageViews = Math.round(day.pageViews * factor);
      day.linkClicks = Math.min(day.pageViews, Math.max(1, Math.round(day.linkClicks * factor)));
    }
  }

  return days;
}

function buildGamePlan(slug: string, name: string, linkKinds: string[], now: Date): GamePlan {
  const rng = mulberry32(hashString(slug) || 1);
  const origin = hashString(`${slug}:visitors`) % VISITOR_POOL;
  const counts = buildDailyCounts(rng, now);
  const days: DailyPlan[] = counts.map((count) => {
    const picked = pickWeighted(rng, COUNTRIES, between(rng, 10, 16));
    const viewParts = spread(
      count.pageViews,
      picked.map((country) => country.weight),
    );
    const active = picked.flatMap((country, index) =>
      viewParts[index] > 0 ? [{ code: country.code, views: viewParts[index] }] : [],
    );
    const clickParts = spread(
      count.linkClicks,
      active.map((country) => country.views),
    );
    const countries: Record<string, AnalyticsCountryBucket> = {};
    active.forEach((country, index) => {
      countries[country.code] = {
        pageViews: country.views,
        linkClicks: clickParts[index] ?? 0,
      };
    });

    const kinds = ["primary", ...linkKinds];
    const clickCounts = spread(
      count.linkClicks,
      kinds.map((kind) => LINK_WEIGHT[kind] ?? 6),
    );
    const clicks: Record<string, number> = {};
    kinds.forEach((kind, index) => {
      if (clickCounts[index] > 0) clicks[kind] = clickCounts[index];
    });

    const unique = Math.min(
      count.pageViews,
      Math.max(1, Math.round(count.pageViews * (0.4 + rng() * 0.18))),
    );

    return {
      day: count.day,
      pageViews: count.pageViews,
      linkClicks: count.linkClicks,
      clicks,
      countries,
      visitors: pickVisitors(rng, unique, origin),
    };
  });

  for (const day of days) {
    const viewSum = Object.values(day.countries).reduce((sum, bucket) => sum + bucket.pageViews, 0);
    const clickSum = Object.values(day.countries).reduce((sum, bucket) => sum + bucket.linkClicks, 0);
    const kindSum = Object.values(day.clicks).reduce((sum, count) => sum + count, 0);
    if (viewSum !== day.pageViews || clickSum !== day.linkClicks || kindSum !== day.linkClicks) {
      throw new Error(`Analytics totals drifted for ${slug} on ${day.day}`);
    }
  }

  const recentDays = new Set(days.slice(-7).map((day) => day.day));
  const unique7d = new Set(
    days.flatMap((day) => (recentDays.has(day.day) ? day.visitors : [])),
  );

  const current = getIsoWeekUtc(now);
  const listings = Array.from({ length: LAUNCH_WEEKS }, (_, index) =>
    shiftIsoWeek(current.year, current.week, -(LAUNCH_WEEKS - 1 - index)),
  );
  const voteRows = listings.flatMap((week, index) => {
    const distance = LAUNCH_WEEKS - 1 - index;
    const scale = distance === 0 ? 1 : distance === 1 ? 0.84 : 0.62 + (LAUNCH_WEEKS - distance) * 0.04;
    const swing = 0.72 + rng() * 0.7;
    const count = between(rng, Math.round(180 * scale * swing), Math.round(700 * scale * swing));
    const range = isoWeekRangeUtc(week.year, week.week);
    const end = range.end.getTime() < now.getTime() ? range.end : now;
    return sampleIds(rng, Math.max(24, count), USER_POOL).map((userId) => ({
      userId,
      isoYear: week.year,
      isoWeek: week.week,
      createdAt: new Date(range.start.getTime() + rng() * Math.max(1, end.getTime() - range.start.getTime())),
    }));
  });

  const likeCount = between(rng, 500, 1600);
  const bookmarkCount = between(rng, 180, 600);
  const templates = shuffle(rng, REVIEW_TEMPLATES).slice(0, REVIEWS_PER_GAME);
  const usedNames = new Set<string>();
  const reviewers: number[] = [];
  let guard = 0;
  while (reviewers.length < REVIEWS_PER_GAME && guard < 2000) {
    const userId = Math.floor(rng() * USER_POOL);
    const name = persona(userId).displayName;
    guard += 1;
    if (reviewers.includes(userId) || usedNames.has(name)) continue;
    reviewers.push(userId);
    usedNames.add(name);
  }

  return {
    days,
    pageViews: days.reduce((sum, day) => sum + day.pageViews, 0),
    linkClicks: days.reduce((sum, day) => sum + day.linkClicks, 0),
    views7d: days.slice(-7).reduce((sum, day) => sum + day.pageViews, 0),
    unique7d: unique7d.size,
    countries: new Set(days.flatMap((day) => Object.keys(day.countries))).size,
    likes: sampleIds(rng, likeCount, USER_POOL),
    bookmarks: sampleIds(rng, bookmarkCount, USER_POOL),
    reviews: reviewers.map((userId, index) => {
      const template = templates[index % templates.length];
      return {
        userId,
        rating: template.rating,
        body: template.body(name),
        createdAt: pastDate(rng, now),
      };
    }),
    votes: voteRows,
    listings,
  };
}

function chunks<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function insertVisitors(
  client: PoolClient,
  gameId: string,
  rows: Array<{ visitorKey: string; day: string }>,
) {
  for (const batch of chunks(rows, INSERT_CHUNK)) {
    await client.query(
      `insert into game_analytics_visitors (game_id, visitor_key, day)
       select $1, key, day
       from unnest($2::text[], $3::date[]) as t(key, day)
       on conflict do nothing`,
      [gameId, batch.map((row) => row.visitorKey), batch.map((row) => row.day)],
    );
  }
}

async function seedGame(
  db: NodePgDatabase,
  client: PoolClient,
  game: { id: string; slug: string; name: string },
  linkKinds: string[],
  now: Date,
) {
  const plan = buildGamePlan(game.slug, game.name, linkKinds, now);

  await db.delete(gameAnalyticsDaily).where(eq(gameAnalyticsDaily.gameId, game.id));
  await db.delete(gameAnalyticsClickVisitors).where(eq(gameAnalyticsClickVisitors.gameId, game.id));
  await db.delete(gameAnalyticsVisitors).where(eq(gameAnalyticsVisitors.gameId, game.id));

  await db.insert(gameAnalyticsDaily).values(
    plan.days.map((day) => ({
      gameId: game.id,
      day: day.day,
      pageViews: day.pageViews,
      linkClicks: day.linkClicks,
      clicks: day.clicks,
      countries: day.countries,
    })),
  );

  await insertVisitors(
    client,
    game.id,
    plan.days.flatMap((day) =>
      day.visitors.map((visitorId) => ({
        visitorKey: visitorKey(visitorId),
        day: day.day,
      })),
    ),
  );

  await db
    .insert(weekListings)
    .values(
      plan.listings.map((listing) => ({
        gameId: game.id,
        isoYear: listing.year,
        isoWeek: listing.week,
        featured: false,
      })),
    )
    .onConflictDoNothing();

  if (plan.votes.length > 0) {
    await db
      .insert(votes)
      .values(
        plan.votes.map((vote) => ({
          clerkUserId: persona(vote.userId).clerkUserId,
          gameId: game.id,
          isoYear: vote.isoYear,
          isoWeek: vote.isoWeek,
          rankingAt: vote.createdAt,
          createdAt: vote.createdAt,
        })),
      )
      .onConflictDoNothing();
  }

  if (plan.likes.length > 0) {
    await db
      .insert(likes)
      .values(
        plan.likes.map((userId) => ({
          clerkUserId: persona(userId).clerkUserId,
          gameId: game.id,
          createdAt: pastDate(mulberry32(hashString(`${game.slug}:like:${userId}`)), now),
        })),
      )
      .onConflictDoNothing();
  }

  if (plan.bookmarks.length > 0) {
    await db
      .insert(bookmarks)
      .values(
        plan.bookmarks.map((userId) => ({
          clerkUserId: persona(userId).clerkUserId,
          gameId: game.id,
          createdAt: pastDate(mulberry32(hashString(`${game.slug}:save:${userId}`)), now),
        })),
      )
      .onConflictDoNothing();
  }

  if (plan.reviews.length > 0) {
    await db
      .insert(gameReviews)
      .values(
        plan.reviews.map((review) => ({
          gameId: game.id,
          clerkUserId: persona(review.userId).clerkUserId,
          displayName: persona(review.userId).displayName,
          rating: review.rating,
          body: review.body,
          createdAt: review.createdAt,
          updatedAt: review.createdAt,
        })),
      )
      .onConflictDoNothing();
  }

  await db
    .update(games)
    .set({
      pageViews: plan.pageViews,
      outboundClicks: plan.linkClicks,
    })
    .where(eq(games.id, game.id));

  const [check] = await db
    .select({
      pageViews: sql<number>`coalesce(sum(${gameAnalyticsDaily.pageViews}), 0)::int`,
      linkClicks: sql<number>`coalesce(sum(${gameAnalyticsDaily.linkClicks}), 0)::int`,
    })
    .from(gameAnalyticsDaily)
    .where(eq(gameAnalyticsDaily.gameId, game.id));

  if (Number(check?.pageViews) !== plan.pageViews || Number(check?.linkClicks) !== plan.linkClicks) {
    throw new Error(`Stored analytics did not match the plan for ${game.slug}`);
  }

  return plan;
}

async function main() {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  const db = drizzle(client);
  const now = new Date();

  try {
    await client.query("begin");
    await client.query("set local statement_timeout = '180s'");
    await client.query("set local time zone 'UTC'");

    const catalog = await db
      .select({ id: games.id, slug: games.slug, name: games.name })
      .from(games)
      .where(isNull(games.archivedAt));
    const linkRows = await db
      .select({ gameId: gameLinks.gameId, kind: gameLinks.kind })
      .from(gameLinks);

    if (catalog.length === 0) {
      console.log("No live games to seed.");
      await client.query("commit");
      return;
    }

    await db.delete(gameReviews).where(like(gameReviews.clerkUserId, SEED_USER));
    await db.delete(likes).where(like(likes.clerkUserId, SEED_USER));
    await db.delete(bookmarks).where(like(bookmarks.clerkUserId, SEED_USER));
    await db.delete(votes).where(like(votes.clerkUserId, SEED_USER));
    await db.delete(gameAnalyticsClickVisitors).where(
      like(gameAnalyticsClickVisitors.visitorKey, SEED_USER),
    );
    await db.delete(gameAnalyticsVisitors).where(like(gameAnalyticsVisitors.visitorKey, SEED_USER));

    const linksByGame = new Map<string, string[]>();
    for (const link of linkRows) {
      const kinds = linksByGame.get(link.gameId) ?? [];
      kinds.push(link.kind);
      linksByGame.set(link.gameId, kinds);
    }

    console.log(`Seeding analytics for ${catalog.length} live games.`);
    const summary: Array<{ name: string; plan: GamePlan }> = [];
    for (const game of catalog) {
      const kinds = (linksByGame.get(game.id) ?? []).slice().sort();
      const plan = await seedGame(db, client, game, kinds, now);
      summary.push({ name: game.name, plan });
      console.log(
        `${game.name}: ${plan.pageViews.toLocaleString("en-US")} views ` +
          `(${plan.views7d.toLocaleString("en-US")} in 7d, ` +
          `${plan.unique7d.toLocaleString("en-US")} unique), ` +
          `${plan.linkClicks.toLocaleString("en-US")} clicks, ` +
          `${plan.countries} countries, ` +
          `${plan.votes.length.toLocaleString("en-US")} upvotes, ` +
          `${plan.likes.length.toLocaleString("en-US")} likes, ` +
          `${plan.bookmarks.length.toLocaleString("en-US")} bookmarks, ` +
          `${plan.reviews.length} reviews`,
      );
    }

    const current = getIsoWeekUtc(now);
    for (let index = 0; index < LAUNCH_WEEKS; index += 1) {
      const week = shiftIsoWeek(current.year, current.week, -(LAUNCH_WEEKS - 1 - index));
      if (compareIsoWeek(week, current) >= 0) continue;
      await db
        .update(weekListings)
        .set({ finalRank: null, rankVoteCount: null, snapshottedAt: null })
        .where(and(eq(weekListings.isoYear, week.year), eq(weekListings.isoWeek, week.week)));
    }

    await client.query("commit");
    const views = summary.reduce((sum, row) => sum + row.plan.pageViews, 0);
    console.log(
      `Done. ${views.toLocaleString("en-US")} views across ${summary.length} games. ` +
        "Run npm run db:seed:analytics again to rebuild this demo.",
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
