import { and, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import { games, votes, weekListings } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { isIsoWeekLive } from "@/lib/iso-week";
import type { RankedGame, SearchGame, WeekBoard } from "@/lib/types";

function toRanked(
  rows: Array<{
    game: typeof games.$inferSelect;
    featured: boolean;
    voteCount: number;
    voted: boolean;
  }>,
): RankedGame[] {
  const ranked = rows.toSorted((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.game.name.localeCompare(b.game.name);
  });

  return ranked.map((row, index) => ({
    id: row.game.id,
    slug: row.game.slug,
    name: row.game.name,
    tagline: row.game.tagline,
    description: row.game.description,
    coverUrl: row.game.coverUrl,
    trailerUrl: row.game.trailerUrl,
    developerName: row.game.developerName,
    primaryUrl: row.game.primaryUrl,
    status: row.game.status,
    tags: row.game.tags ?? [],
    platforms: row.game.platforms ?? [],
    outboundClicks: row.game.outboundClicks,
    featured: row.featured,
    voteCount: row.voteCount,
    voted: row.voted,
    rank: index + 1,
  }));
}

export const getWeekBoard = cache(async function getWeekBoard(
  year: number,
  week: number,
  userId?: string | null,
): Promise<WeekBoard> {
  if (!hasDatabase()) {
    return { year, week, live: isIsoWeekLive(year, week), games: [] };
  }

  const db = getDb();
  const rows = await db
    .select({
      game: games,
      featured: weekListings.featured,
      voteCount: sql<number>`coalesce(count(${votes.id}), 0)::int`,
      voted: userId
        ? sql<boolean>`coalesce(bool_or(${votes.clerkUserId} = ${userId}), false)`
        : sql<boolean>`false`,
    })
    .from(weekListings)
    .innerJoin(games, eq(weekListings.gameId, games.id))
    .leftJoin(
      votes,
      and(
        eq(votes.gameId, games.id),
        eq(votes.isoYear, weekListings.isoYear),
        eq(votes.isoWeek, weekListings.isoWeek),
      ),
    )
    .where(and(eq(weekListings.isoYear, year), eq(weekListings.isoWeek, week)))
    .groupBy(games.id, weekListings.id);

  return {
    year,
    week,
    live: isIsoWeekLive(year, week),
    games: toRanked(rows),
  };
});

export const getGameBySlug = cache(async function getGameBySlug(slug: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [game] = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return game ?? null;
});

export async function getGameBoardContext(
  slug: string,
  userId?: string | null,
) {
  const game = await getGameBySlug(slug);
  if (!game) return null;

  if (!hasDatabase()) {
    return { game, listings: [] as WeekBoard[] };
  }

  const db = getDb();
  const listings = await db
    .select({
      isoYear: weekListings.isoYear,
      isoWeek: weekListings.isoWeek,
    })
    .from(weekListings)
    .where(eq(weekListings.gameId, game.id))
    .orderBy(desc(weekListings.isoYear), desc(weekListings.isoWeek));

  const boards = await Promise.all(
    listings.map((listing) => getWeekBoard(listing.isoYear, listing.isoWeek, userId)),
  );

  return { game, listings: boards };
}

export const listSearchableGames = cache(async function listSearchableGames(): Promise<
  SearchGame[]
> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      slug: games.slug,
      name: games.name,
      tagline: games.tagline,
      coverUrl: games.coverUrl,
      voteCount: sql<number>`coalesce(count(${votes.id}), 0)::int`,
    })
    .from(games)
    .leftJoin(votes, eq(votes.gameId, games.id))
    .groupBy(games.id)
    .orderBy(games.name)
    .limit(100);

  return rows;
});

export async function listAllGames() {
  if (!hasDatabase()) return [];
  const db = getDb();
  return db.select().from(games).orderBy(games.name);
}

export async function getGameById(id: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return game ?? null;
}

export async function countWeekListings(year: number, week: number) {
  if (!hasDatabase()) return 0;
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(weekListings)
    .where(and(eq(weekListings.isoYear, year), eq(weekListings.isoWeek, week)));
  return row?.count ?? 0;
}

export async function incrementOutboundClicks(gameId: string) {
  if (!hasDatabase()) return;
  const db = getDb();
  await db
    .update(games)
    .set({
      outboundClicks: sql`${games.outboundClicks} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId));
}

export async function toggleWeekVote(opts: {
  userId: string;
  gameId: string;
  year: number;
  week: number;
}) {
  const db = getDb();
  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      and(
        eq(votes.clerkUserId, opts.userId),
        eq(votes.gameId, opts.gameId),
        eq(votes.isoYear, opts.year),
        eq(votes.isoWeek, opts.week),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db.delete(votes).where(eq(votes.id, existing[0].id));
    return { voted: false };
  }

  await db.insert(votes).values({
    clerkUserId: opts.userId,
    gameId: opts.gameId,
    isoYear: opts.year,
    isoWeek: opts.week,
  });
  return { voted: true };
}
