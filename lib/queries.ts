import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { cache } from "react";

import { gameLinks, gameMedia, gamePlatforms, gameReviews, games, platforms, votes, weekListings } from "@/db/schema";
import { canManageGame, isAdminUserId } from "@/lib/auth-admin";
import { REVIEW_PAGE_SIZE } from "@/lib/constants";
import { getDb, hasDatabase } from "@/lib/db";
import { isIsoWeekLive } from "@/lib/iso-week";
import type {
  GameLaunchItem,
  GamePageData,
  GamePlatformItem,
  GameReviewItem,
  RankedGame,
  SearchGame,
  WeekBoard,
} from "@/lib/types";
import { withVideosFirst } from "@/lib/urls";

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

  return ranked.map((row, index) => rankedGame(row.game, {
    featured: row.featured,
    voteCount: row.voteCount,
    voted: row.voted,
    rank: index + 1,
  }));
}

function rankedGame(
  game: typeof games.$inferSelect,
  extras: { featured: boolean; voteCount: number; voted: boolean; rank: number },
  platformItems: GamePlatformItem[] = [],
): RankedGame {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    tagline: game.tagline,
    description: game.description,
    coverUrl: game.coverUrl,
    logoUrl: game.logoUrl,
    trailerUrl: game.trailerUrl,
    developerName: game.developerName,
    primaryUrl: game.primaryUrl,
    status: game.status,
    tags: game.tags ?? [],
    platforms: platformItems,
    outboundClicks: game.outboundClicks,
    featured: extras.featured,
    voteCount: extras.voteCount,
    voted: extras.voted,
    rank: extras.rank,
  };
}

function toPlatformItem(row: {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
}): GamePlatformItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: row.logoUrl,
  };
}

async function platformsByGameIds(gameIds: string[]): Promise<Map<string, GamePlatformItem[]>> {
  const map = new Map<string, GamePlatformItem[]>();
  if (gameIds.length === 0 || !hasDatabase()) return map;

  const db = getDb();
  const rows = await db
    .select({
      gameId: gamePlatforms.gameId,
      id: platforms.id,
      slug: platforms.slug,
      name: platforms.name,
      logoUrl: platforms.logoUrl,
    })
    .from(gamePlatforms)
    .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
    .where(inArray(gamePlatforms.gameId, gameIds))
    .orderBy(asc(platforms.sortOrder), asc(platforms.name));

  for (const row of rows) {
    const list = map.get(row.gameId) ?? [];
    list.push(toPlatformItem(row));
    map.set(row.gameId, list);
  }
  return map;
}

async function withPlatforms(games: RankedGame[]): Promise<RankedGame[]> {
  const byGame = await platformsByGameIds(games.map((game) => game.id));
  return games.map((game) => ({
    ...game,
    platforms: byGame.get(game.id) ?? [],
  }));
}

export const listAllPlatforms = cache(async function listAllPlatforms() {
  if (!hasDatabase()) return [];
  const db = getDb();
  return db
    .select()
    .from(platforms)
    .orderBy(asc(platforms.sortOrder), asc(platforms.name));
});

export const listActivePlatforms = cache(async function listActivePlatforms(): Promise<
  GamePlatformItem[]
> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: platforms.id,
      slug: platforms.slug,
      name: platforms.name,
      logoUrl: platforms.logoUrl,
    })
    .from(platforms)
    .where(isNull(platforms.archivedAt))
    .orderBy(asc(platforms.sortOrder), asc(platforms.name));
  return rows.map(toPlatformItem);
});

export const listEditorPlatforms = cache(async function listEditorPlatforms(
  selectedIds: string[],
): Promise<GamePlatformItem[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: platforms.id,
      slug: platforms.slug,
      name: platforms.name,
      logoUrl: platforms.logoUrl,
      archivedAt: platforms.archivedAt,
    })
    .from(platforms)
    .orderBy(asc(platforms.sortOrder), asc(platforms.name));
  const selected = new Set(selectedIds);
  return rows
    .filter((row) => !row.archivedAt || selected.has(row.id))
    .map(toPlatformItem);
});

export async function getPlatformById(id: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [row] = await db.select().from(platforms).where(eq(platforms.id, id)).limit(1);
  return row ?? null;
}

export async function listGamePlatforms(gameId: string): Promise<GamePlatformItem[]> {
  const map = await platformsByGameIds([gameId]);
  return map.get(gameId) ?? [];
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
    .where(
      and(
        eq(weekListings.isoYear, year),
        eq(weekListings.isoWeek, week),
        isNull(games.archivedAt),
      ),
    )
    .groupBy(games.id, weekListings.id);

  return {
    year,
    week,
    live: isIsoWeekLive(year, week),
    games: await withPlatforms(toRanked(rows)),
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
    .where(isNull(games.archivedAt))
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
    .innerJoin(games, eq(weekListings.gameId, games.id))
    .where(
      and(
        eq(weekListings.isoYear, year),
        eq(weekListings.isoWeek, week),
        isNull(games.archivedAt),
      ),
    );
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
    .where(and(eq(games.id, gameId), isNull(games.archivedAt)));
}

export async function toggleWeekVote(opts: {
  userId: string;
  gameId: string;
  year: number;
  week: number;
}) {
  const db = getDb();
  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.id, opts.gameId), isNull(games.archivedAt)))
    .limit(1);
  if (!game) throw new Error("Game not found");

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

function encodeReviewCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, "utf8").toString("base64url");
}

function decodeReviewCursor(cursor: string | null) {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = decoded.split("|");
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export async function listGameReviews(opts: {
  gameId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<{ items: GameReviewItem[]; nextCursor: string | null }> {
  if (!hasDatabase()) return { items: [], nextCursor: null };
  const db = getDb();
  const limit = opts.limit ?? REVIEW_PAGE_SIZE;
  const parsed = decodeReviewCursor(opts.cursor ?? null);

  const rows = await db
    .select()
    .from(gameReviews)
    .where(
      parsed
        ? and(
            eq(gameReviews.gameId, opts.gameId),
            or(
              lt(gameReviews.createdAt, parsed.createdAt),
              and(eq(gameReviews.createdAt, parsed.createdAt), lt(gameReviews.id, parsed.id)),
            ),
          )
        : eq(gameReviews.gameId, opts.gameId),
    )
    .orderBy(desc(gameReviews.createdAt), desc(gameReviews.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      displayName: row.displayName,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt.toISOString(),
      clerkUserId: row.clerkUserId,
    })),
    nextCursor: hasMore && last ? encodeReviewCursor(last.createdAt, last.id) : null,
  };
}

export async function getGamePageData(
  slug: string,
  userId?: string | null,
): Promise<GamePageData | null> {
  const gameRow = await getGameBySlug(slug);
  if (!gameRow) return null;

  const isAdmin = isAdminUserId(userId);
  const isOwner = canManageGame(userId, gameRow.ownerClerkUserId);
  if (gameRow.archivedAt && !isOwner) return null;

  if (!hasDatabase()) return null;
  const db = getDb();

  const [mediaRows, linkRows, listingRows, reviewAgg, viewerRows, firstReviews, platformMap] =
    await Promise.all([
      db
        .select()
        .from(gameMedia)
        .where(eq(gameMedia.gameId, gameRow.id))
        .orderBy(gameMedia.sortOrder),
      db.select().from(gameLinks).where(eq(gameLinks.gameId, gameRow.id)),
      db
        .select({
          isoYear: weekListings.isoYear,
          isoWeek: weekListings.isoWeek,
          featured: weekListings.featured,
        })
        .from(weekListings)
        .where(eq(weekListings.gameId, gameRow.id))
        .orderBy(desc(weekListings.isoYear), desc(weekListings.isoWeek)),
      db
        .select({
          count: sql<number>`count(*)::int`,
          average: sql<number | null>`avg(${gameReviews.rating})`,
        })
        .from(gameReviews)
        .where(eq(gameReviews.gameId, gameRow.id)),
      userId
        ? db
            .select({ rating: gameReviews.rating, body: gameReviews.body })
            .from(gameReviews)
            .where(and(eq(gameReviews.gameId, gameRow.id), eq(gameReviews.clerkUserId, userId)))
            .limit(1)
        : Promise.resolve([]),
      listGameReviews({ gameId: gameRow.id }),
      platformsByGameIds([gameRow.id]),
    ]);

  const boards = await Promise.all(
    listingRows.map((listing) => getWeekBoard(listing.isoYear, listing.isoWeek, userId)),
  );

  const launches: GameLaunchItem[] = listingRows.map((listing, index) => {
    const board = boards[index];
    const ranked = board?.games.find((item) => item.id === gameRow.id);
    return {
      year: listing.isoYear,
      week: listing.isoWeek,
      live: board?.live ?? false,
      featured: listing.featured,
      voteCount: ranked?.voteCount ?? 0,
      rank: ranked?.rank ?? 0,
    };
  });

  const liveBoard = launches.find((launch) => launch.live);
  const extras = liveBoard
    ? {
        featured: liveBoard.featured,
        voteCount: liveBoard.voteCount,
        voted: boards.find((board) => board.live)?.games.find((item) => item.id === gameRow.id)?.voted ?? false,
        rank: liveBoard.rank,
      }
    : {
        featured: false,
        voteCount: launches[0]?.voteCount ?? 0,
        voted: false,
        rank: launches[0]?.rank ?? 0,
      };

  const agg = reviewAgg[0];

  return {
    game: rankedGame(gameRow, extras, platformMap.get(gameRow.id) ?? []),
    media: withVideosFirst(
      mediaRows.map((row) => ({
        id: row.id,
        kind: row.kind,
        url: row.url,
        sortOrder: row.sortOrder,
      })),
    ),
    links: linkRows.map((row) => ({ kind: row.kind, url: row.url })),
    launches,
    isOwner,
    isAdmin,
    archived: Boolean(gameRow.archivedAt),
    reviewAverage: agg?.average != null ? Number(agg.average) : null,
    reviewCount: agg?.count ?? 0,
    reviews: firstReviews.items,
    reviewsNextCursor: firstReviews.nextCursor,
    viewerReview: viewerRows[0] ?? null,
  };
}

export async function getGameEditorData(id: string) {
  const game = await getGameById(id);
  if (!game) return null;
  if (!hasDatabase()) return { game, media: [], links: [], platformIds: [] as string[] };
  const db = getDb();
  const [media, links, selected] = await Promise.all([
    db.select().from(gameMedia).where(eq(gameMedia.gameId, id)).orderBy(gameMedia.sortOrder),
    db.select().from(gameLinks).where(eq(gameLinks.gameId, id)),
    db
      .select({ platformId: gamePlatforms.platformId })
      .from(gamePlatforms)
      .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
      .where(eq(gamePlatforms.gameId, id))
      .orderBy(asc(platforms.sortOrder), asc(platforms.name)),
  ]);
  return {
    game,
    media: withVideosFirst(media),
    links,
    platformIds: selected.map((row) => row.platformId),
  };
}
