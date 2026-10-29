import { redirect } from "next/navigation";

import { CollectionsBrowser, type CollectionFilters } from "@/components/board/collections-browser";
import { getCurrentUserId } from "@/lib/auth-admin";
import {
  COLLECTION_SORTS,
  GAME_STATUSES,
  type CollectionSort,
  type GameStatus,
  type SortDirection,
} from "@/lib/constants";
import { compareIsoWeek, getIsoWeekUtc, parseWeekParams } from "@/lib/iso-week";
import {
  getWeekBoard,
  listActiveCategories,
  listActivePlatforms,
  listCollectionGamesPage,
} from "@/lib/queries";
import { isTrendRange } from "@/lib/trending/periods";
import { listTrendingGamesPage } from "@/lib/trending/queries";

function normalizeCollectionSort(
  view: "all" | "weekly",
  sort: CollectionSort | undefined,
  dir: SortDirection | undefined,
): { sort: CollectionSort; dir: SortDirection } {
  if (view === "weekly") {
    if (sort === "name" || sort === "status" || sort === "votes") {
      const fallback = sort === "votes" ? "desc" : "asc";
      return { sort, dir: dir ?? fallback };
    }
    return { sort: "votes", dir: "desc" };
  }
  if (sort === "name" || sort === "status") {
    return { sort, dir: dir ?? "asc" };
  }
  if (sort === "newest") return { sort: "newest", dir: dir === "asc" ? "asc" : "desc" };
  return { sort: "newest", dir: "desc" };
}

function isDefaultCollectionSort(filters: CollectionFilters) {
  return filters.view === "weekly"
    ? filters.sort === "votes" && filters.dir === "desc"
    : filters.sort === "newest" && filters.dir === "desc";
}

function many(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    range?: string;
    year?: string;
    week?: string;
    category?: string | string[];
    platform?: string | string[];
    status?: string | string[];
    sort?: string;
    dir?: string;
  }>;
}) {
  const params = await searchParams;
  const current = getIsoWeekUtc();
  const requested =
    params.year && params.week ? parseWeekParams(params.year, params.week) : null;
  const selected =
    requested && compareIsoWeek(requested, current) <= 0 ? requested : current;
  const view =
    params.view === "weekly" ? "weekly" : params.view === "trending" ? "trending" : "all";
  const requestedSort = COLLECTION_SORTS.find((sort) => sort === params.sort);
  const requestedDir: SortDirection | undefined =
    params.dir === "asc" || params.dir === "desc" ? params.dir : undefined;
  const sort =
    view === "trending"
      ? { sort: "newest" as const, dir: "desc" as const }
      : normalizeCollectionSort(view, requestedSort, requestedDir);
  const filters: CollectionFilters = {
    view,
    categories: many(params.category).filter(Boolean),
    platforms: many(params.platform).filter(Boolean),
    statuses: many(params.status).filter((status): status is GameStatus =>
      GAME_STATUSES.includes(status as GameStatus),
    ),
    year: selected.year,
    week: selected.week,
    sort: sort.sort,
    dir: sort.dir,
    range: isTrendRange(params.range) ? params.range : "today",
  };
  if (
    view === "weekly" &&
    params.year &&
    params.week &&
    (!requested || requested.year !== selected.year || requested.week !== selected.week)
  ) {
    const next = new URLSearchParams();
    next.set("view", "weekly");
    next.set("year", String(selected.year));
    next.set("week", String(selected.week));
    for (const category of filters.categories) next.append("category", category);
    for (const platform of filters.platforms) next.append("platform", platform);
    for (const status of filters.statuses) next.append("status", status);
    if (!isDefaultCollectionSort(filters)) {
      next.set("sort", filters.sort);
      next.set("dir", filters.dir);
    }
    redirect(`/collections?${next.toString()}`);
  }
  const catalogPromise =
    view === "all"
      ? listCollectionGamesPage({
          categories: filters.categories,
          platforms: filters.platforms,
          statuses: filters.statuses,
          sort: filters.sort === "votes" ? "newest" : filters.sort,
          dir: filters.dir,
        })
      : Promise.resolve({ games: [], nextCursor: null });
  const trendingPromise =
    view === "trending"
      ? listTrendingGamesPage({
          range: filters.range,
          categories: filters.categories,
          platforms: filters.platforms,
          statuses: filters.statuses,
        })
      : Promise.resolve({ games: [], nextCursor: null });
  const categoriesPromise = listActiveCategories();
  const platformsPromise = listActivePlatforms();
  const userId = view === "weekly" ? await getCurrentUserId() : null;
  const [catalog, trending, weekBoard, categories, platforms] = await Promise.all([
    catalogPromise,
    trendingPromise,
    view === "weekly"
      ? getWeekBoard(selected.year, selected.week, userId)
      : Promise.resolve(null),
    categoriesPromise,
    platformsPromise,
  ]);
  const page = view === "trending" ? trending : catalog;

  return (
    <CollectionsBrowser
      games={page.games}
      nextCursor={page.nextCursor}
      trendPoints={"points" in trending ? trending.points : {}}
      weekBoard={weekBoard}
      currentWeek={current}
      categories={categories}
      platforms={platforms}
      filters={filters}
    />
  );
}

export const metadata = { title: 'Game Collections' };
