import { and, asc, eq, exists, gt, inArray, isNull } from "drizzle-orm";
import { cache } from "react";

import {
  categories,
  gameCategories,
  gamePlatforms,
  games,
  platforms,
  trendSnapshotRanks,
  trendSnapshots,
} from "@/db/schema";
import { COLLECTION_PAGE_SIZE, GAME_STATUSES, type GameStatus } from "@/lib/constants";
import { getDb, hasDatabase } from "@/lib/db";
import { asCatalogGame, withCatalog, type CollectionPage } from "@/lib/queries";
import { isTrendRange, trendRangePeriod, type TrendRange } from "@/lib/trending/periods";
import { ensureFreshTrends } from "@/lib/trending/recompute";

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

export async function listTopTrendingGames(limit = 5) {
  const page = await listTrendingGamesPage({ limit, range: "today" });
  return page.games;
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
