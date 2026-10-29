import { cachedApiRead } from "@/lib/api/cache";
import {
  toPublicCatalogGame,
  toPublicCategory,
  toPublicGame,
  toPublicPlatform,
  toPublicProfile,
  toPublicProfileReview,
  toPublicReview,
  toPublicSavedGame,
  toPublicTrendGame,
  toPublicWeek,
} from "@/lib/api/dto";
import { API_PAGE_LIMIT } from "@/lib/api/params";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getProfileByHandle } from "@/lib/profile";
import {
  getFollowState,
  getGameBySlug,
  getGamePageData,
  getWeekBoard,
  listActiveCategories,
  listActivePlatforms,
  listCollectionGamesPage,
  listGameReviews,
  listProfileGamesPage,
  listProfileReviewsPage,
} from "@/lib/queries";
import { searchCatalog } from "@/lib/search";
import type { GameStatus } from "@/lib/constants";
import type { SearchScope } from "@/lib/types";
import type { TrendRange } from "@/lib/trending/periods";
import { listTrendingGamesPage } from "@/lib/trending/queries";
import { weekCacheSeconds } from "@/lib/week-rank";

const TTL = {
  search: 15,
  reviews: 30,
  game: 60,
  profile: 60,
  trending: 60,
  catalog: 60,
  taxonomy: 600,
} as const;

function pageLimit(limit: number | undefined) {
  return limit ?? API_PAGE_LIMIT;
}

function hiddenGame(row: {
  archivedAt: Date | null;
  takenDownAt: Date | null;
  hiddenByBan: boolean;
}) {
  return Boolean(row.archivedAt || row.takenDownAt || row.hiddenByBan);
}

export async function readCurrentWeek() {
  const current = getIsoWeekUtc();
  return readWeek(current.year, current.week);
}

export async function readWeek(year: number, week: number) {
  const cached = await cachedApiRead(
    `week:${year}:${week}`,
    (board) => weekCacheSeconds(board.ranksFrozen),
    async () => {
      const board = await getWeekBoard(year, week, null, false);
      return { ...toPublicWeek(board), ranksFrozen: board.ranksFrozen };
    },
  );
  if (!cached) return null;
  const { ranksFrozen, ...board } = cached;
  void ranksFrozen;
  return board;
}

export async function readGame(slug: string) {
  return cachedApiRead(`game:${slug}`, TTL.game, async () => {
    const row = await getGameBySlug(slug);
    if (!row || hiddenGame(row)) return null;
    const page = await getGamePageData(slug, null, null, false);
    if (!page || page.archived) return null;
    return toPublicGame(page);
  });
}

export async function readGameReviews(slug: string, cursor: string | undefined, limit: number | undefined) {
  const size = pageLimit(limit);
  return cachedApiRead(`reviews:${slug}:${cursor ?? ""}:${size}`, TTL.reviews, async () => {
    const row = await getGameBySlug(slug);
    if (!row || hiddenGame(row)) return null;
    const page = await listGameReviews({ gameId: row.id, cursor, limit: size });
    return {
      items: page.items.map(toPublicReview),
      nextCursor: page.nextCursor,
    };
  });
}

export async function readSearch(input: { q: string; scope: SearchScope; platform: string | null }) {
  return cachedApiRead(
    `search:${input.scope}:${input.platform ?? ""}:${input.q}`,
    TTL.search,
    async () => {
      const result = await searchCatalog({
        q: input.q,
        scope: input.scope,
        platform: input.platform,
      });
      return {
        games: result.games.map((game) => ({
          slug: game.slug,
          name: game.name,
          tagline: game.tagline,
          logoUrl: game.logoUrl,
        })),
        people: result.people.map((person) => ({
          handle: person.handle,
          name: person.name,
          imageUrl: person.imageUrl,
          headline: person.headline,
        })),
      };
    },
  );
}

export async function readTrending(input: {
  range: TrendRange;
  platforms: string[];
  categories: string[];
  statuses: GameStatus[];
  cursor?: string;
  limit?: number;
}) {
  const size = pageLimit(input.limit);
  const key = [
    "trend",
    input.range,
    input.platforms.join(","),
    input.categories.join(","),
    input.statuses.join(","),
    input.cursor ?? "",
    String(size),
  ].join(":");
  return cachedApiRead(key, TTL.trending, async () => {
    const page = await listTrendingGamesPage({
      range: input.range,
      platforms: input.platforms,
      categories: input.categories,
      statuses: input.statuses,
      cursor: input.cursor,
      limit: size,
      ensureFresh: false,
      includePoints: false,
    });
    return {
      range: input.range,
      items: page.games.map(toPublicTrendGame),
      nextCursor: page.nextCursor,
    };
  });
}

export async function readCatalog(input: {
  platforms: string[];
  categories: string[];
  statuses: GameStatus[];
  sort: "newest" | "name" | "status";
  dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}) {
  const size = pageLimit(input.limit);
  const key = [
    "catalog",
    input.sort,
    input.dir ?? "",
    input.platforms.join(","),
    input.categories.join(","),
    input.statuses.join(","),
    input.cursor ?? "",
    String(size),
  ].join(":");
  return cachedApiRead(key, TTL.catalog, async () => {
    const page = await listCollectionGamesPage({
      platforms: input.platforms,
      categories: input.categories,
      statuses: input.statuses,
      sort: input.sort,
      dir: input.dir,
      cursor: input.cursor,
      limit: size,
    });
    return {
      items: page.games.map(toPublicCatalogGame),
      nextCursor: page.nextCursor,
    };
  });
}

export async function readPlatforms() {
  return cachedApiRead("platforms", TTL.taxonomy, async () => {
    const rows = await listActivePlatforms();
    return { items: rows.map(toPublicPlatform) };
  });
}

export async function readCategories() {
  return cachedApiRead("categories", TTL.taxonomy, async () => {
    const rows = await listActiveCategories();
    return { items: rows.map(toPublicCategory) };
  });
}

export async function readProfile(handle: string) {
  return cachedApiRead(`profile:${handle}`, TTL.profile, async () => {
    const profile = await getProfileByHandle(handle);
    if (!profile) return null;
    const counts = await getFollowState(null, profile.clerkUserId);
    return toPublicProfile(profile, counts);
  });
}

export async function readProfileGames(handle: string, cursor: string | undefined, limit: number | undefined) {
  const size = pageLimit(limit);
  return cachedApiRead(`profile-games:${handle}:${cursor ?? ""}:${size}`, TTL.profile, async () => {
    const profile = await getProfileByHandle(handle);
    if (!profile) return null;
    const page = await listProfileGamesPage({
      userId: profile.clerkUserId,
      view: "published",
      cursor,
      limit: size,
    });
    return {
      items: page.items.map(toPublicSavedGame),
      nextCursor: page.nextCursor,
    };
  });
}

export async function readProfileReviews(handle: string, cursor: string | undefined, limit: number | undefined) {
  const size = pageLimit(limit);
  return cachedApiRead(`profile-reviews:${handle}:${cursor ?? ""}:${size}`, TTL.reviews, async () => {
    const profile = await getProfileByHandle(handle);
    if (!profile) return null;
    const page = await listProfileReviewsPage({
      userId: profile.clerkUserId,
      cursor,
      limit: size,
    });
    return {
      items: page.items.map(toPublicProfileReview),
      nextCursor: page.nextCursor,
    };
  });
}
