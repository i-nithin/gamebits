"use server";

import { GAME_STATUSES, type CollectionSort, type GameStatus, type SortDirection } from "@/lib/constants";
import { listCollectionGamesPage, type CollectionPage } from "@/lib/queries";
import { isTrendRange } from "@/lib/trending/periods";
import { listTrendingGamesPage } from "@/lib/trending/queries";

export async function loadMoreCollectionGames(input: {
  cursor: string;
  categories: string[];
  platforms: string[];
  statuses: string[];
  sort: CollectionSort;
  dir: SortDirection;
}): Promise<CollectionPage> {
  if (!input.cursor) return { games: [], nextCursor: null };
  const statuses = input.statuses.filter((status): status is GameStatus =>
    GAME_STATUSES.includes(status as GameStatus),
  );
  const sort = input.sort === "name" || input.sort === "status" ? input.sort : "newest";
  const dir = input.dir === "asc" ? "asc" : "desc";
  return listCollectionGamesPage({
    categories: input.categories,
    platforms: input.platforms,
    statuses,
    sort,
    dir,
    cursor: input.cursor,
  });
}

export async function loadMoreTrendingGames(input: {
  cursor: string;
  range: string;
  categories: string[];
  platforms: string[];
  statuses: string[];
}): Promise<CollectionPage & { points: Record<string, number[]> }> {
  if (!input.cursor) return { games: [], nextCursor: null, points: {} };
  const statuses = input.statuses.filter((status): status is GameStatus =>
    GAME_STATUSES.includes(status as GameStatus),
  );
  return listTrendingGamesPage({
    range: isTrendRange(input.range) ? input.range : "today",
    categories: input.categories,
    platforms: input.platforms,
    statuses,
    cursor: input.cursor,
  });
}
