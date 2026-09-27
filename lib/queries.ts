import { and, asc, count, desc, eq, exists, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { cache } from "react";

import { bookmarks, categories, follows, gameCategories, gameLinks, gameMedia, gamePlatforms, gameReviews, games, likes, platforms, profiles, votes, weekListings } from "@/db/schema";
import { canManageGame, isAdminUserId } from "@/lib/auth-admin";
import {
  COLLECTION_PAGE_SIZE,
  GAME_STATUSES,
  REVIEW_PAGE_SIZE,
  type CollectionSort,
  type GameStatus,
  type SortDirection,
} from "@/lib/constants";
import { getDb, hasDatabase } from "@/lib/db";
import { isIsoWeekLive } from "@/lib/iso-week";
import { isUuid } from "@/lib/sanitize";
import type {
  FollowProfile,
  FollowState,
  GameCategoryItem,
  GameLaunchItem,
  GamePageData,
  GamePlatformItem,
  GameReviewItem,
  ProfileReview,
  RankedGame,
  SavedGame,
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
  categoryItems: GameCategoryItem[] = [],
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
    categories: categoryItems,
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

function toCategoryItem(row: {
  id: string;
  slug: string;
  name: string;
}): GameCategoryItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
  };
}

async function categoriesByGameIds(gameIds: string[]): Promise<Map<string, GameCategoryItem[]>> {
  const map = new Map<string, GameCategoryItem[]>();
  if (gameIds.length === 0 || !hasDatabase()) return map;

  const db = getDb();
  const rows = await db
    .select({
      gameId: gameCategories.gameId,
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    })
    .from(gameCategories)
    .innerJoin(categories, eq(gameCategories.categoryId, categories.id))
    .where(inArray(gameCategories.gameId, gameIds))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  for (const row of rows) {
    const list = map.get(row.gameId) ?? [];
    list.push(toCategoryItem(row));
    map.set(row.gameId, list);
  }
  return map;
}

async function withCatalog(items: RankedGame[]): Promise<RankedGame[]> {
  const ids = items.map((game) => game.id);
  const [platformMap, categoryMap] = await Promise.all([
    platformsByGameIds(ids),
    categoriesByGameIds(ids),
  ]);
  return items.map((game) => ({
    ...game,
    platforms: platformMap.get(game.id) ?? [],
    categories: categoryMap.get(game.id) ?? [],
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

export const listPlatformCatalog = cache(async function listPlatformCatalog() {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: platforms.id,
      slug: platforms.slug,
      name: platforms.name,
      logoUrl: platforms.logoUrl,
      sortOrder: platforms.sortOrder,
      archivedAt: platforms.archivedAt,
      gameCount: count(gamePlatforms.id),
    })
    .from(platforms)
    .leftJoin(gamePlatforms, eq(gamePlatforms.platformId, platforms.id))
    .groupBy(
      platforms.id,
      platforms.slug,
      platforms.name,
      platforms.logoUrl,
      platforms.sortOrder,
      platforms.archivedAt,
    )
    .orderBy(asc(platforms.sortOrder), asc(platforms.name));
  return rows.map((row) => ({
    ...row,
    gameCount: Number(row.gameCount),
  }));
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

export const listCategoryCatalog = cache(async function listCategoryCatalog() {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      archivedAt: categories.archivedAt,
      gameCount: count(gameCategories.id),
    })
    .from(categories)
    .leftJoin(gameCategories, eq(gameCategories.categoryId, categories.id))
    .groupBy(categories.id, categories.slug, categories.name, categories.sortOrder, categories.archivedAt)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map((row) => ({
    ...row,
    gameCount: Number(row.gameCount),
  }));
});

export const listActiveCategories = cache(async function listActiveCategories(): Promise<
  GameCategoryItem[]
> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
    })
    .from(categories)
    .where(isNull(categories.archivedAt))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map(toCategoryItem);
});

export const listEditorCategories = cache(async function listEditorCategories(
  selectedIds: string[],
): Promise<GameCategoryItem[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      archivedAt: categories.archivedAt,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const selected = new Set(selectedIds);
  return rows
    .filter((row) => !row.archivedAt || selected.has(row.id))
    .map(toCategoryItem);
});

export async function getCategoryById(id: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

const CATALOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanCatalogSlugs(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length <= 80 && CATALOG_SLUG_RE.test(value)),
    ),
  ].slice(0, 20);
}

const CATALOG_CURSOR_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

type CatalogCursor = {
  sort: Exclude<CollectionSort, "votes">;
  dir: SortDirection;
  value: string;
  id: string;
};

function encodeCatalogCursor(cursor: CatalogCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCatalogCursor(
  cursor: string | null | undefined,
  sort: Exclude<CollectionSort, "votes">,
  dir: SortDirection,
): CatalogCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CatalogCursor;
    if (parsed.sort !== sort || parsed.dir !== dir || !isUuid(parsed.id)) return null;
    if (typeof parsed.value !== "string" || parsed.value.length > 200) return null;
    if (sort === "newest" && !CATALOG_CURSOR_TIME.test(parsed.value)) return null;
    if (sort === "status" && !GAME_STATUSES.includes(parsed.value as GameStatus)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type CollectionPage = {
  games: RankedGame[];
  nextCursor: string | null;
};

export const listCollectionGamesPage = cache(async function listCollectionGamesPage(opts: {
  categories?: string[];
  platforms?: string[];
  statuses?: GameStatus[];
  sort?: Exclude<CollectionSort, "votes">;
  dir?: SortDirection;
  cursor?: string | null;
  limit?: number;
}): Promise<CollectionPage> {
  if (!hasDatabase()) return { games: [], nextCursor: null };

  const categorySlugs = cleanCatalogSlugs(opts.categories ?? []);
  const platformSlugs = cleanCatalogSlugs(opts.platforms ?? []);
  const statuses = (opts.statuses ?? []).filter((status) => GAME_STATUSES.includes(status));
  const sort = opts.sort === "name" || opts.sort === "status" ? opts.sort : "newest";
  const dir = opts.dir === "asc" ? "asc" : sort === "newest" ? "desc" : opts.dir === "desc" ? "desc" : "asc";
  const cursor = decodeCatalogCursor(opts.cursor, sort, dir);
  const limit = opts.limit ?? COLLECTION_PAGE_SIZE;
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
  const sortColumn = sort === "name" ? games.name : sort === "status" ? games.status : games.createdAt;
  const valueBefore = cursor
    ? sort === "newest"
      ? sql`${games.createdAt} < ${cursor.value}::timestamptz`
      : lt(sortColumn, cursor.value)
    : undefined;
  const valueAfter = cursor
    ? sort === "newest"
      ? sql`${games.createdAt} > ${cursor.value}::timestamptz`
      : gt(sortColumn, cursor.value)
    : undefined;
  const valueEqual = cursor
    ? sort === "newest"
      ? sql`${games.createdAt} = ${cursor.value}::timestamptz`
      : eq(sortColumn, cursor.value)
    : undefined;
  const cursorMatch = cursor
    ? or(
        dir === "desc" ? valueBefore : valueAfter,
        and(valueEqual, dir === "desc" ? lt(games.id, cursor.id) : gt(games.id, cursor.id)),
      )
    : undefined;

  const rows = await db
    .select({
      game: games,
      createdAtCursor: sql<string>`to_char(${games.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(games)
    .where(
      and(
        isNull(games.archivedAt),
        statuses.length > 0 ? inArray(games.status, statuses) : undefined,
        categoryMatch,
        platformMatch,
        cursorMatch,
      ),
    )
    .orderBy(
      ...(dir === "desc" ? [desc(sortColumn), desc(games.id)] : [asc(sortColumn), asc(games.id)]),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    games: await withCatalog(
      page.map((row, index) =>
        rankedGame(row.game, {
          featured: false,
          voteCount: 0,
          voted: false,
          rank: index + 1,
        }),
      ),
    ),
    nextCursor:
      hasMore && last
        ? encodeCatalogCursor({
            sort,
            dir,
            value:
              sort === "name"
                ? last.game.name
                : sort === "status"
                  ? last.game.status
                  : last.createdAtCursor,
            id: last.game.id,
          })
        : null,
  };
});

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
    games: await withCatalog(toRanked(rows)),
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

export async function toggleBookmark(opts: { userId: string; gameId: string }) {
  const db = getDb();
  const [game] = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(and(eq(games.id, opts.gameId), isNull(games.archivedAt)))
    .limit(1);
  if (!game) return null;

  const existing = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.clerkUserId, opts.userId), eq(bookmarks.gameId, opts.gameId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
    return { bookmarked: false, slug: game.slug };
  }

  await db.insert(bookmarks).values({
    clerkUserId: opts.userId,
    gameId: opts.gameId,
  });
  return { bookmarked: true, slug: game.slug };
}

export async function toggleLike(opts: { userId: string; gameId: string }) {
  const db = getDb();
  const [game] = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(and(eq(games.id, opts.gameId), isNull(games.archivedAt)))
    .limit(1);
  if (!game) return null;

  const existing = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.clerkUserId, opts.userId), eq(likes.gameId, opts.gameId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(likes).where(eq(likes.id, existing[0].id));
  } else {
    await db.insert(likes).values({
      clerkUserId: opts.userId,
      gameId: opts.gameId,
    });
  }

  const [countRow] = await db
    .select({ likeCount: sql<number>`count(*)::int` })
    .from(likes)
    .where(eq(likes.gameId, opts.gameId));

  return {
    liked: !existing[0],
    likeCount: countRow?.likeCount ?? 0,
    slug: game.slug,
  };
}

const savedGameColumns = {
  id: games.id,
  slug: games.slug,
  name: games.name,
  tagline: games.tagline,
  logoUrl: games.logoUrl,
  status: games.status,
};

async function toSavedGames(
  rows: Array<{
    id: string;
    slug: string;
    name: string;
    tagline: string;
    logoUrl: string;
    status: SavedGame["status"];
  }>,
): Promise<SavedGame[]> {
  const ids = rows.map((row) => row.id);
  const [platformMap, categoryMap] = await Promise.all([
    platformsByGameIds(ids),
    categoriesByGameIds(ids),
  ]);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    status: row.status,
    categories: categoryMap.get(row.id) ?? [],
    platforms: platformMap.get(row.id) ?? [],
  }));
}

export async function listBookmarks(userId: string): Promise<SavedGame[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select(savedGameColumns)
    .from(bookmarks)
    .innerJoin(games, eq(bookmarks.gameId, games.id))
    .where(and(eq(bookmarks.clerkUserId, userId), isNull(games.archivedAt)))
    .orderBy(desc(bookmarks.createdAt));
  return toSavedGames(rows);
}

export async function listLikes(userId: string): Promise<SavedGame[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select(savedGameColumns)
    .from(likes)
    .innerJoin(games, eq(likes.gameId, games.id))
    .where(and(eq(likes.clerkUserId, userId), isNull(games.archivedAt)))
    .orderBy(desc(likes.createdAt));
  return toSavedGames(rows);
}

export async function listPublishedGames(userId: string): Promise<SavedGame[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select(savedGameColumns)
    .from(games)
    .where(and(eq(games.ownerClerkUserId, userId), isNull(games.archivedAt)))
    .orderBy(desc(games.createdAt));
  return toSavedGames(rows);
}

export async function listArchivedGames(userId: string): Promise<SavedGame[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select(savedGameColumns)
    .from(games)
    .where(and(eq(games.ownerClerkUserId, userId), isNotNull(games.archivedAt)))
    .orderBy(desc(games.archivedAt));
  const saved = await toSavedGames(rows);
  return saved.map((game) => ({ ...game, archived: true }));
}

const followProfileColumns = {
  clerkUserId: profiles.clerkUserId,
  handle: profiles.handle,
  name: profiles.name,
  imageUrl: profiles.imageUrl,
};

export async function getFollowState(
  viewerId: string | null,
  profileUserId: string,
): Promise<FollowState> {
  if (!hasDatabase()) {
    return { followerCount: 0, followingCount: 0, following: false };
  }
  const db = getDb();
  const [followers, following, existing] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(follows)
      .where(eq(follows.followingClerkUserId, profileUserId)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(follows)
      .where(eq(follows.followerClerkUserId, profileUserId)),
    viewerId
      ? db
          .select({ id: follows.id })
          .from(follows)
          .where(
            and(
              eq(follows.followerClerkUserId, viewerId),
              eq(follows.followingClerkUserId, profileUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  return {
    followerCount: followers[0]?.value ?? 0,
    followingCount: following[0]?.value ?? 0,
    following: Boolean(existing[0]),
  };
}

export async function listFollowers(userId: string): Promise<FollowProfile[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  return db
    .select(followProfileColumns)
    .from(follows)
    .innerJoin(profiles, eq(profiles.clerkUserId, follows.followerClerkUserId))
    .where(eq(follows.followingClerkUserId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function listFollowing(userId: string): Promise<FollowProfile[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  return db
    .select(followProfileColumns)
    .from(follows)
    .innerJoin(profiles, eq(profiles.clerkUserId, follows.followingClerkUserId))
    .where(eq(follows.followerClerkUserId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function toggleFollow(opts: { followerId: string; followingId: string }) {
  if (opts.followerId === opts.followingId || !hasDatabase()) return null;
  const db = getDb();
  const [target] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.clerkUserId, opts.followingId))
    .limit(1);
  if (!target) return null;

  const existing = await db
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerClerkUserId, opts.followerId),
        eq(follows.followingClerkUserId, opts.followingId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return { following: false, targetHandle: target.handle };
  }

  await db.insert(follows).values({
    followerClerkUserId: opts.followerId,
    followingClerkUserId: opts.followingId,
  });
  return { following: true, targetHandle: target.handle };
}

export async function listProfileReviews(userId: string): Promise<ProfileReview[]> {
  if (!hasDatabase()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: gameReviews.id,
      rating: gameReviews.rating,
      body: gameReviews.body,
      createdAt: gameReviews.createdAt,
      gameSlug: games.slug,
      gameName: games.name,
      gameLogoUrl: games.logoUrl,
    })
    .from(gameReviews)
    .innerJoin(games, eq(gameReviews.gameId, games.id))
    .where(and(eq(gameReviews.clerkUserId, userId), isNull(games.archivedAt)))
    .orderBy(desc(gameReviews.createdAt));

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    gameSlug: row.gameSlug,
    gameName: row.gameName,
    gameLogoUrl: row.gameLogoUrl,
  }));
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
  reviewId?: string | null,
): Promise<GamePageData | null> {
  const gameRow = await getGameBySlug(slug);
  if (!gameRow) return null;

  const isAdmin = isAdminUserId(userId);
  const isOwner = canManageGame(userId, gameRow.ownerClerkUserId);
  if (gameRow.archivedAt && !isOwner) return null;

  if (!hasDatabase()) return null;
  const db = getDb();

  const [mediaRows, linkRows, listingRows, reviewAgg, viewerRows, firstReviews, platformMap, categoryMap, bookmarkRows, likeRows] =
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
      categoriesByGameIds([gameRow.id]),
      userId
        ? db
            .select({ id: bookmarks.id })
            .from(bookmarks)
            .where(and(eq(bookmarks.gameId, gameRow.id), eq(bookmarks.clerkUserId, userId)))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          likeCount: sql<number>`count(*)::int`,
          liked: userId
            ? sql<boolean>`coalesce(bool_or(${likes.clerkUserId} = ${userId}), false)`
            : sql<boolean>`false`,
        })
        .from(likes)
        .where(eq(likes.gameId, gameRow.id)),
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
  const reviewIdOk = Boolean(reviewId && /^[0-9a-f-]{36}$/i.test(reviewId));
  let reviews = firstReviews.items;
  if (reviewIdOk && reviewId && !reviews.some((item) => item.id === reviewId)) {
    const [row] = await db
      .select()
      .from(gameReviews)
      .where(and(eq(gameReviews.id, reviewId), eq(gameReviews.gameId, gameRow.id)))
      .limit(1);
    if (row) {
      reviews = [
        ...reviews,
        {
          id: row.id,
          rating: row.rating,
          body: row.body,
          displayName: row.displayName,
          imageUrl: row.imageUrl,
          createdAt: row.createdAt.toISOString(),
          clerkUserId: row.clerkUserId,
        },
      ];
    }
  }

  return {
    game: rankedGame(
      gameRow,
      extras,
      platformMap.get(gameRow.id) ?? [],
      categoryMap.get(gameRow.id) ?? [],
    ),
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
    reviews: reviews,
    reviewsNextCursor: firstReviews.nextCursor,
    viewerReview: viewerRows[0] ?? null,
    bookmarked: Boolean(bookmarkRows[0]),
    liked: Boolean(likeRows[0]?.liked),
    likeCount: likeRows[0]?.likeCount ?? 0,
  };
}

export async function getGameEditorData(id: string) {
  const game = await getGameById(id);
  if (!game) return null;
  if (!hasDatabase()) {
    return { game, media: [], links: [], platformIds: [] as string[], categoryIds: [] as string[] };
  }
  const db = getDb();
  const [media, links, selected, selectedCategories] = await Promise.all([
    db.select().from(gameMedia).where(eq(gameMedia.gameId, id)).orderBy(gameMedia.sortOrder),
    db.select().from(gameLinks).where(eq(gameLinks.gameId, id)),
    db
      .select({ platformId: gamePlatforms.platformId })
      .from(gamePlatforms)
      .innerJoin(platforms, eq(gamePlatforms.platformId, platforms.id))
      .where(eq(gamePlatforms.gameId, id))
      .orderBy(asc(platforms.sortOrder), asc(platforms.name)),
    db
      .select({ categoryId: gameCategories.categoryId })
      .from(gameCategories)
      .innerJoin(categories, eq(gameCategories.categoryId, categories.id))
      .where(eq(gameCategories.gameId, id))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);
  return {
    game,
    media: withVideosFirst(media),
    links,
    platformIds: selected.map((row) => row.platformId),
    categoryIds: selectedCategories.map((row) => row.categoryId),
  };
}
