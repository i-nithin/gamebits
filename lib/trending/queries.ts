import { and, asc, eq, exists, gt, gte, inArray, isNull, lte } from "drizzle-orm";
import { cache } from "react";

import {
  bookmarks,
  categories,
  gameAnalyticsEvents,
  gameCategories,
  gamePlatforms,
  gameReviews,
  games,
  likes,
  platforms,
  trendSnapshotRanks,
  trendSnapshots,
  votes,
} from "@/db/schema";
import { COLLECTION_PAGE_SIZE, GAME_STATUSES, type GameStatus } from "@/lib/constants";
import { getDb, hasDatabase } from "@/lib/db";
import { asCatalogGame, withCatalog, type CollectionPage } from "@/lib/queries";
import { isTrendRange, trendRangePeriod, type TrendRange } from "@/lib/trending/periods";
import { ensureFreshTrends } from "@/lib/trending/recompute";
import { SPARKLINE_BUCKETS, sparklinePoints } from "@/lib/trending/sparkline";
import type { TrendEvent } from "@/lib/trending/score";
import type { RankedGame } from "@/lib/types";

const CATALOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const listTrendingGamesPage = cache(async function listTrendingGamesPage(opts?: {
  range?: TrendRange;
  categories?: string[];
  platforms?: string[];
  statuses?: GameStatus[];
  cursor?: string | null;
  limit?: number;
}): Promise<CollectionPage> {
  if (!hasDatabase()) return { games: [], nextCursor: null };
  await ensureFreshTrends();

  const range = opts?.range && isTrendRange(opts.range) ? opts.range : "today";
  const period = trendRangePeriod(range);
  const categorySlugs = cleanSlugs(opts?.categories ?? []);
  const platformSlugs = cleanSlugs(opts?.platforms ?? []);
  const statuses = (opts?.statuses ?? []).filter((status) => GAME_STATUSES.includes(status));
  const cursor = decodeTrendCursor(opts?.cursor, range);
  const limit = opts?.limit ?? COLLECTION_PAGE_SIZE;
  const db = getDb();
  const categoryMatch =
    categorySlugs.length === 0
      ? undefined
      : exists(
          db
            .select({ id: gameCategories.id })
            .from(gameCategories)
            .innerJoin(categories, eq(gameCategories.categoryId, categories.id))
            .where(
              and(eq(gameCategories.gameId, games.id), inArray(categories.slug, categorySlugs)),
            ),
        );
  const platformMatch =
    platformSlugs.length === 0
      ? undefined
      : exists(
          db
            .select({ id: gamePlatforms.id })
            .from(gamePlatforms)
            .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
            .where(and(eq(gamePlatforms.gameId, games.id), inArray(platforms.slug, platformSlugs))),
        );

  const rows = await db
    .select({ game: games, rank: trendSnapshotRanks.rank })
    .from(trendSnapshotRanks)
    .innerJoin(trendSnapshots, eq(trendSnapshotRanks.snapshotId, trendSnapshots.id))
    .innerJoin(games, eq(trendSnapshotRanks.gameId, games.id))
    .where(
      and(
        eq(trendSnapshots.kind, period.kind),
        eq(trendSnapshots.periodKey, period.key),
        isNull(games.archivedAt),
        statuses.length > 0 ? inArray(games.status, statuses) : undefined,
        categoryMatch,
        platformMatch,
        cursor ? gt(trendSnapshotRanks.rank, cursor) : undefined,
      ),
    )
    .orderBy(asc(trendSnapshotRanks.rank))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    games: await withCatalog(page.map((row) => asCatalogGame(row.game, row.rank))),
    nextCursor: hasMore && last ? encodeTrendCursor(last.rank, range) : null,
  };
});

export type TrendingRailItem = {
  game: RankedGame;
  points: number[];
};

export async function listTopTrendingGames(limit = 5): Promise<TrendingRailItem[]> {
  const page = await listTrendingGamesPage({ limit, range: "today" });
  const pointsByGame = await todaySparklinePoints(page.games.map((game) => game.id));
  return page.games.map((game) => ({
    game,
    points: pointsByGame.get(game.id) ?? sparklinePoints([], utcDayStart(new Date()), new Date()),
  }));
}

async function todaySparklinePoints(gameIds: string[]) {
  const now = new Date();
  const start = utcDayStart(now);
  const points = new Map(gameIds.map((id) => [id, sparklinePoints([], start, now)]));
  if (gameIds.length === 0 || !hasDatabase()) return points;

  const db = getDb();
  const inGames = inArray(games.id, gameIds);
  const [owners, viewRows, likeRows, bookmarkRows, voteRows, reviewRows] = await Promise.all([
    db
      .select({ id: games.id, ownerClerkUserId: games.ownerClerkUserId })
      .from(games)
      .where(inGames),
    db
      .select({
        gameId: gameAnalyticsEvents.gameId,
        kind: gameAnalyticsEvents.kind,
        at: gameAnalyticsEvents.createdAt,
      })
      .from(gameAnalyticsEvents)
      .where(and(
        inArray(gameAnalyticsEvents.gameId, gameIds),
        gte(gameAnalyticsEvents.createdAt, start),
        lte(gameAnalyticsEvents.createdAt, now),
      )),
    db
      .select({
        gameId: likes.gameId,
        actorId: likes.clerkUserId,
        at: likes.createdAt,
      })
      .from(likes)
      .where(and(inArray(likes.gameId, gameIds), gte(likes.createdAt, start), lte(likes.createdAt, now))),
    db
      .select({
        gameId: bookmarks.gameId,
        actorId: bookmarks.clerkUserId,
        at: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(and(
        inArray(bookmarks.gameId, gameIds),
        gte(bookmarks.createdAt, start),
        lte(bookmarks.createdAt, now),
      )),
    db
      .select({
        gameId: votes.gameId,
        actorId: votes.clerkUserId,
        at: votes.createdAt,
      })
      .from(votes)
      .where(and(
        inArray(votes.gameId, gameIds),
        isNull(votes.withdrawnAt),
        gte(votes.createdAt, start),
        lte(votes.createdAt, now),
      )),
    db
      .select({
        gameId: gameReviews.gameId,
        actorId: gameReviews.clerkUserId,
        at: gameReviews.createdAt,
        rating: gameReviews.rating,
      })
      .from(gameReviews)
      .where(and(
        inArray(gameReviews.gameId, gameIds),
        isNull(gameReviews.removedAt),
        gte(gameReviews.createdAt, start),
        lte(gameReviews.createdAt, now),
      )),
  ]);

  const ownerByGame = new Map(owners.map((row) => [row.id, row.ownerClerkUserId]));
  const eventsByGame = new Map<string, TrendEvent[]>(gameIds.map((id) => [id, []]));

  for (const row of viewRows) {
    eventsByGame.get(row.gameId)?.push({
      gameId: row.gameId,
      kind: row.kind === "link_click" ? "click" : "visitor",
      at: row.at,
    });
  }
  pushOwned(eventsByGame, ownerByGame, likeRows, "like");
  pushOwned(eventsByGame, ownerByGame, bookmarkRows, "bookmark");
  pushOwned(eventsByGame, ownerByGame, voteRows, "vote");
  for (const row of reviewRows) {
    if (row.actorId === ownerByGame.get(row.gameId)) continue;
    eventsByGame.get(row.gameId)?.push({
      gameId: row.gameId,
      kind: "review",
      at: row.at,
      rating: row.rating,
    });
  }

  for (const id of gameIds) {
    points.set(id, sparklinePoints(eventsByGame.get(id) ?? [], start, now, SPARKLINE_BUCKETS));
  }
  return points;
}

function pushOwned(
  eventsByGame: Map<string, TrendEvent[]>,
  ownerByGame: Map<string, string | null>,
  rows: Array<{ gameId: string; actorId: string; at: Date }>,
  kind: "like" | "bookmark" | "vote",
) {
  for (const row of rows) {
    if (row.actorId === ownerByGame.get(row.gameId)) continue;
    eventsByGame.get(row.gameId)?.push({
      gameId: row.gameId,
      kind,
      at: row.at,
    });
  }
}

function utcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function cleanSlugs(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length <= 80 && CATALOG_SLUG_RE.test(value)),
    ),
  ].slice(0, 20);
}

function encodeTrendCursor(rank: number, range: TrendRange) {
  return Buffer.from(JSON.stringify({ rank, range }), "utf8").toString("base64url");
}

function decodeTrendCursor(cursor: string | null | undefined, range: TrendRange) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      rank?: unknown;
      range?: unknown;
    };
    if (parsed.range !== range) return null;
    if (typeof parsed.rank !== "number" || !Number.isInteger(parsed.rank) || parsed.rank < 1) {
      return null;
    }
    return parsed.rank;
  } catch {
    return null;
  }
}
