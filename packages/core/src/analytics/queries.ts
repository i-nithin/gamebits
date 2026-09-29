import { and, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";

import {
  bookmarks,
  gameAnalyticsDaily,
  gameReviews,
  games,
  likes,
  votes,
  weekListings,
} from "@gamebits/db/schema";
import {
  analyticsLinkLabel,
  compareAnalyticsLinkKind,
  isAnalyticsLinkKind,
  type AnalyticsLinkKind,
} from "./links";
import { buildMetricDeltas, emptyDeltas } from "./format";
import {
  buildAllWindow,
  fillSeriesDays,
  formatPeriodLabel,
  resolveAnalyticsWindow,
  type AnalyticsWindow,
} from "./range";
import type {
  AnalyticsClickRow,
  AnalyticsCountryRow,
  AnalyticsGameRow,
  AnalyticsLaunch,
  AnalyticsPortfolio,
  AnalyticsSearchParams,
  AnalyticsSeriesPoint,
  AnalyticsTotals,
  GameAnalytics,
} from "./types";
import type { AnalyticsCountryBucket } from "@gamebits/db/schema";
import { isStaffUser, getCurrentUserId } from "@gamebits/auth";
import { getDb, hasDatabase } from "@gamebits/db";
import { isIsoWeekLive } from "@gamebits/db/iso-week";

const TOP_COUNTRIES = 8;
function asCount(value: number | string | null | undefined) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? count : 0;
}

function emptyTotals(): AnalyticsTotals {
  return {
    upvotes: 0,
    pageViews: 0,
    linkClicks: 0,
    likes: 0,
    bookmarks: 0,
    reviewCount: 0,
    reviewAverage: null,
  };
}

function countByGame(rows: Array<{ gameId: string; count: number | string }>) {
  return new Map(rows.map((row) => [row.gameId, asCount(row.count)]));
}

function weekKey(year: number, week: number) {
  return `${year}:${week}`;
}

function weekTupleFilter(
  yearColumn: typeof weekListings.isoYear | typeof votes.isoYear,
  weekColumn: typeof weekListings.isoWeek | typeof votes.isoWeek,
  listings: Array<{ isoYear: number; isoWeek: number }>,
) {
  return sql`(${yearColumn}, ${weekColumn}) in (${sql.join(
    listings.map((listing) => sql`(${listing.isoYear}, ${listing.isoWeek})`),
    sql`, `,
  )})`;
}

function rankOnWeek(
  peers: Array<{ gameId: string; name: string; voteCount: number }>,
  gameId: string,
) {
  const ordered = peers.toSorted((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.name.localeCompare(b.name);
  });
  const index = ordered.findIndex((peer) => peer.gameId === gameId);
  return index >= 0 ? index + 1 : 0;
}

function dayBounds(window: AnalyticsWindow) {
  if (!window.start || !window.end) return null;
  return and(
    gte(gameAnalyticsDaily.day, window.start),
    lte(gameAnalyticsDaily.day, window.end),
  );
}

function previousOf(window: AnalyticsWindow): AnalyticsWindow | null {
  if (!window.previousStart || !window.previousEnd) return null;
  return {
    ...window,
    start: window.previousStart,
    end: window.previousEnd,
  };
}

function clickRowsFromMap(
  totals: Map<string, number>,
  outboundClicks: number,
): AnalyticsClickRow[] {
  let tracked = 0;
  const known: AnalyticsClickRow[] = [];
  const unknown: AnalyticsClickRow[] = [];

  for (const [kind, count] of totals) {
    if (count <= 0) continue;
    tracked += count;
    if (isAnalyticsLinkKind(kind)) {
      known.push({ kind, label: analyticsLinkLabel(kind), count });
      continue;
    }
    unknown.push({ kind, label: kind || "Link", count });
  }

  known.sort((a, b) =>
    compareAnalyticsLinkKind(a.kind as AnalyticsLinkKind, b.kind as AnalyticsLinkKind),
  );

  const clicks = [...known, ...unknown];
  const earlier = Math.max(0, outboundClicks - tracked);
  if (earlier > 0) clicks.push({ kind: "earlier", label: "Earlier Play clicks", count: earlier });
  return clicks;
}

function topCountriesFromMap(
  totals: Map<string, { pageViews: number; linkClicks: number }>,
  limit = TOP_COUNTRIES,
): AnalyticsCountryRow[] {
  return [...totals.entries()]
    .map(([code, value]) => ({
      code,
      pageViews: value.pageViews,
      linkClicks: value.linkClicks,
    }))
    .toSorted((a, b) => b.pageViews - a.pageViews || b.linkClicks - a.linkClicks || a.code.localeCompare(b.code))
    .slice(0, limit);
}

function mergeCountryBucket(
  target: Map<string, { pageViews: number; linkClicks: number }>,
  countries: Record<string, AnalyticsCountryBucket> | null | undefined,
) {
  for (const [code, bucket] of Object.entries(countries ?? {})) {
    const current = target.get(code) ?? { pageViews: 0, linkClicks: 0 };
    current.pageViews += asCount(bucket?.pageViews);
    current.linkClicks += asCount(bucket?.linkClicks);
    target.set(code, current);
  }
}

async function sumDailyForGames(
  gameIds: string[],
  window: AnalyticsWindow,
): Promise<{
  byGame: Map<string, { pageViews: number; linkClicks: number }>;
  series: AnalyticsSeriesPoint[];
  seriesByGame: Map<string, AnalyticsSeriesPoint[]>;
  clickMaps: Map<string, Map<string, number>>;
  countries: Map<string, { pageViews: number; linkClicks: number }>;
}> {
  const byGame = new Map<string, { pageViews: number; linkClicks: number }>();
  const seriesByGame = new Map<string, AnalyticsSeriesPoint[]>();
  const clickMaps = new Map<string, Map<string, number>>();
  const countries = new Map<string, { pageViews: number; linkClicks: number }>();
  const empty = {
    byGame,
    series: [] as AnalyticsSeriesPoint[],
    seriesByGame,
    clickMaps,
    countries,
  };
  if (gameIds.length === 0) return empty;

  const db = getDb();
  const bounds = dayBounds(window);
  const rows = await db
    .select({
      gameId: gameAnalyticsDaily.gameId,
      day: gameAnalyticsDaily.day,
      pageViews: gameAnalyticsDaily.pageViews,
      linkClicks: gameAnalyticsDaily.linkClicks,
      clicks: gameAnalyticsDaily.clicks,
      countries: gameAnalyticsDaily.countries,
    })
    .from(gameAnalyticsDaily)
    .where(
      bounds
        ? and(inArray(gameAnalyticsDaily.gameId, gameIds), bounds)
        : inArray(gameAnalyticsDaily.gameId, gameIds),
    )
    .orderBy(gameAnalyticsDaily.day);

  const seriesAgg = new Map<string, { pageViews: number; linkClicks: number }>();
  const rawByGame = new Map<string, AnalyticsSeriesPoint[]>();

  for (const row of rows) {
    const pageViews = asCount(row.pageViews);
    const linkClicks = asCount(row.linkClicks);
    const current = byGame.get(row.gameId) ?? { pageViews: 0, linkClicks: 0 };
    current.pageViews += pageViews;
    current.linkClicks += linkClicks;
    byGame.set(row.gameId, current);

    const list = rawByGame.get(row.gameId) ?? [];
    list.push({ day: row.day, pageViews, linkClicks });
    rawByGame.set(row.gameId, list);

    const dayAgg = seriesAgg.get(row.day) ?? { pageViews: 0, linkClicks: 0 };
    dayAgg.pageViews += pageViews;
    dayAgg.linkClicks += linkClicks;
    seriesAgg.set(row.day, dayAgg);

    const clickMap = clickMaps.get(row.gameId) ?? new Map<string, number>();
    for (const [kind, count] of Object.entries(row.clicks ?? {})) {
      clickMap.set(kind, (clickMap.get(kind) ?? 0) + asCount(count));
    }
    clickMaps.set(row.gameId, clickMap);

    mergeCountryBucket(countries, row.countries);
  }

  let series: AnalyticsSeriesPoint[];
  if (window.start && window.end) {
    series = fillSeriesDays(
      window.start,
      window.end,
      [...seriesAgg.entries()].map(([day, value]) => ({ day, ...value })),
    );
    for (const gameId of gameIds) {
      seriesByGame.set(
        gameId,
        fillSeriesDays(window.start, window.end, rawByGame.get(gameId) ?? []),
      );
    }
  } else {
    series = [...seriesAgg.entries()]
      .toSorted((a, b) => a[0].localeCompare(b[0]))
      .map(([day, value]) => ({ day, ...value }));
    for (const [gameId, points] of rawByGame) {
      seriesByGame.set(gameId, points);
    }
  }

  return { byGame, series, seriesByGame, clickMaps, countries };
}

async function countVotesForGames(gameIds: string[], window: AnalyticsWindow) {
  if (gameIds.length === 0) return new Map<string, number>();
  const db = getDb();
  const conditions: SQL[] = [inArray(votes.gameId, gameIds)];
  if (window.start && window.end) {
    conditions.push(
      and(
        gte(votes.createdAt, new Date(`${window.start}T00:00:00.000Z`)),
        lte(votes.createdAt, new Date(`${window.end}T23:59:59.999Z`)),
      )!,
    );
  }
  const rows = await db
    .select({
      gameId: votes.gameId,
      count: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(and(...conditions))
    .groupBy(votes.gameId);
  return countByGame(rows);
}

async function countLikesForGames(gameIds: string[], window: AnalyticsWindow) {
  if (gameIds.length === 0) return new Map<string, number>();
  const db = getDb();
  const conditions: SQL[] = [inArray(likes.gameId, gameIds)];
  if (window.start && window.end) {
    conditions.push(
      and(
        gte(likes.createdAt, new Date(`${window.start}T00:00:00.000Z`)),
        lte(likes.createdAt, new Date(`${window.end}T23:59:59.999Z`)),
      )!,
    );
  }
  const rows = await db
    .select({
      gameId: likes.gameId,
      count: sql<number>`count(*)::int`,
    })
    .from(likes)
    .where(and(...conditions))
    .groupBy(likes.gameId);
  return countByGame(rows);
}

async function countBookmarksForGames(gameIds: string[], window: AnalyticsWindow) {
  if (gameIds.length === 0) return new Map<string, number>();
  const db = getDb();
  const conditions: SQL[] = [inArray(bookmarks.gameId, gameIds)];
  if (window.start && window.end) {
    conditions.push(
      and(
        gte(bookmarks.createdAt, new Date(`${window.start}T00:00:00.000Z`)),
        lte(bookmarks.createdAt, new Date(`${window.end}T23:59:59.999Z`)),
      )!,
    );
  }
  const rows = await db
    .select({
      gameId: bookmarks.gameId,
      count: sql<number>`count(*)::int`,
    })
    .from(bookmarks)
    .where(and(...conditions))
    .groupBy(bookmarks.gameId);
  return countByGame(rows);
}

async function reviewStatsForGames(gameIds: string[], window: AnalyticsWindow) {
  if (gameIds.length === 0) {
    return {
      counts: new Map<string, number>(),
      ratingSums: new Map<string, number>(),
    };
  }
  const db = getDb();
  const conditions: SQL[] = [inArray(gameReviews.gameId, gameIds)];
  if (window.start && window.end) {
    conditions.push(
      and(
        gte(gameReviews.createdAt, new Date(`${window.start}T00:00:00.000Z`)),
        lte(gameReviews.createdAt, new Date(`${window.end}T23:59:59.999Z`)),
      )!,
    );
  }
  const rows = await db
    .select({
      gameId: gameReviews.gameId,
      count: sql<number>`count(*)::int`,
      ratingSum: sql<number>`coalesce(sum(${gameReviews.rating}), 0)::int`,
    })
    .from(gameReviews)
    .where(and(...conditions))
    .groupBy(gameReviews.gameId);

  return {
    counts: countByGame(rows),
    ratingSums: new Map(rows.map((row) => [row.gameId, asCount(row.ratingSum)])),
  };
}

export async function getAnalyticsPortfolio(
  userId: string,
  params: AnalyticsSearchParams = {},
): Promise<AnalyticsPortfolio | null> {
  const sessionUserId = await getCurrentUserId();
  if (!sessionUserId || sessionUserId !== userId || !hasDatabase()) return null;

  const window = resolveAnalyticsWindow({
    params,
    defaultKey: "7d",
  });
  const db = getDb();
  const staff = await isStaffUser(userId);

  const gameRows = await db
    .select({
      id: games.id,
      slug: games.slug,
      name: games.name,
      coverUrl: games.coverUrl,
      archivedAt: games.archivedAt,
      pageViews: games.pageViews,
      outboundClicks: games.outboundClicks,
    })
    .from(games)
    .where(staff ? sql`true` : eq(games.ownerClerkUserId, userId))
    .orderBy(desc(games.createdAt));

  if (gameRows.length === 0) {
    return {
      gameCount: 0,
      range: window.key,
      start: window.start,
      end: window.end,
      periodLabel: formatPeriodLabel(window),
      totals: emptyTotals(),
      previous: null,
      deltas: emptyDeltas(),
      series: [],
      countries: [],
      games: [],
    };
  }

  const ids = gameRows.map((game) => game.id);
  const previousWindow = previousOf(window);

  const [
    daily,
    previousDaily,
    upvoteMap,
    previousUpvotes,
    likeCounts,
    previousLikes,
    bookmarkCounts,
    previousBookmarks,
    reviewStats,
    previousReviews,
  ] = await Promise.all([
    sumDailyForGames(ids, window),
    previousWindow ? sumDailyForGames(ids, previousWindow) : Promise.resolve(null),
    countVotesForGames(ids, window),
    previousWindow ? countVotesForGames(ids, previousWindow) : Promise.resolve(null),
    countLikesForGames(ids, window),
    previousWindow ? countLikesForGames(ids, previousWindow) : Promise.resolve(null),
    countBookmarksForGames(ids, window),
    previousWindow ? countBookmarksForGames(ids, previousWindow) : Promise.resolve(null),
    reviewStatsForGames(ids, window),
    previousWindow ? reviewStatsForGames(ids, previousWindow) : Promise.resolve(null),
  ]);

  const lifetime = window.key === "all";
  let ratingSum = 0;
  for (const id of ids) ratingSum += reviewStats.ratingSums.get(id) ?? 0;

  const list: AnalyticsGameRow[] = gameRows.map((game) => {
    const rollup = daily.byGame.get(game.id);
    return {
      id: game.id,
      slug: game.slug,
      name: game.name,
      coverUrl: game.coverUrl,
      archived: Boolean(game.archivedAt),
      upvotes: upvoteMap.get(game.id) ?? 0,
      pageViews: lifetime ? asCount(game.pageViews) : (rollup?.pageViews ?? 0),
      linkClicks: lifetime ? asCount(game.outboundClicks) : (rollup?.linkClicks ?? 0),
      series: daily.seriesByGame.get(game.id) ?? [],
    };
  });

  const totals = list.reduce<AnalyticsTotals>(
    (sum, game) => {
      sum.upvotes += game.upvotes;
      sum.pageViews += game.pageViews;
      sum.linkClicks += game.linkClicks;
      sum.likes += likeCounts.get(game.id) ?? 0;
      sum.bookmarks += bookmarkCounts.get(game.id) ?? 0;
      sum.reviewCount += reviewStats.counts.get(game.id) ?? 0;
      return sum;
    },
    emptyTotals(),
  );
  totals.reviewAverage = totals.reviewCount > 0 ? ratingSum / totals.reviewCount : null;

  let previous: AnalyticsTotals | null = null;
  if (previousDaily && previousUpvotes && previousLikes && previousBookmarks && previousReviews) {
    previous = emptyTotals();
    let prevRatingSum = 0;
    for (const id of ids) {
      const rollup = previousDaily.byGame.get(id);
      previous.pageViews += rollup?.pageViews ?? 0;
      previous.linkClicks += rollup?.linkClicks ?? 0;
      previous.upvotes += previousUpvotes.get(id) ?? 0;
      previous.likes += previousLikes.get(id) ?? 0;
      previous.bookmarks += previousBookmarks.get(id) ?? 0;
      previous.reviewCount += previousReviews.counts.get(id) ?? 0;
      prevRatingSum += previousReviews.ratingSums.get(id) ?? 0;
    }
    previous.reviewAverage =
      previous.reviewCount > 0 ? prevRatingSum / previous.reviewCount : null;
  }

  return {
    gameCount: list.length,
    range: window.key,
    start: window.start,
    end: window.end,
    periodLabel: formatPeriodLabel(window),
    totals,
    previous,
    deltas: buildMetricDeltas(totals, previous),
    series: daily.series,
    countries: topCountriesFromMap(daily.countries),
    games: list,
  };
}

export async function getGameAnalytics(
  userId: string,
  slug: string,
  params: AnalyticsSearchParams = {},
): Promise<GameAnalytics | null> {
  const sessionUserId = await getCurrentUserId();
  if (!sessionUserId || sessionUserId !== userId || !hasDatabase()) return null;
  const db = getDb();
  const [game] = await db
    .select({
      id: games.id,
      slug: games.slug,
      name: games.name,
      coverUrl: games.coverUrl,
      archivedAt: games.archivedAt,
      pageViews: games.pageViews,
      outboundClicks: games.outboundClicks,
      ownerClerkUserId: games.ownerClerkUserId,
    })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);

  if (!game) return null;
  if (!(await isStaffUser(userId)) && game.ownerClerkUserId !== userId) return null;

  const listings = await db
    .select({
      isoYear: weekListings.isoYear,
      isoWeek: weekListings.isoWeek,
    })
    .from(weekListings)
    .where(eq(weekListings.gameId, game.id))
    .orderBy(desc(weekListings.isoYear), desc(weekListings.isoWeek));

  const hasLaunchRange = listings.length > 0;
  const liveListing = listings.find((l) => isIsoWeekLive(l.isoYear, l.isoWeek));
  const launchListing = liveListing ?? listings[0] ?? null;
  const defaultKey = liveListing ? "launch" : "7d";

  const window = resolveAnalyticsWindow({
    params,
    defaultKey,
    launch: launchListing
      ? { year: launchListing.isoYear, week: launchListing.isoWeek }
      : null,
  });
  const previousWindow = previousOf(window);

  const [
    daily,
    previousDaily,
    upvoteMap,
    previousUpvotes,
    likeCounts,
    previousLikes,
    bookmarkCounts,
    previousBookmarks,
    reviewStats,
    previousReviews,
  ] = await Promise.all([
    sumDailyForGames([game.id], window),
    previousWindow ? sumDailyForGames([game.id], previousWindow) : Promise.resolve(null),
    countVotesForGames([game.id], window),
    previousWindow ? countVotesForGames([game.id], previousWindow) : Promise.resolve(null),
    countLikesForGames([game.id], window),
    previousWindow ? countLikesForGames([game.id], previousWindow) : Promise.resolve(null),
    countBookmarksForGames([game.id], window),
    previousWindow ? countBookmarksForGames([game.id], previousWindow) : Promise.resolve(null),
    reviewStatsForGames([game.id], window),
    previousWindow ? reviewStatsForGames([game.id], previousWindow) : Promise.resolve(null),
  ]);

  const lifetime = window.key === "all";
  const rollup = daily.byGame.get(game.id);
  const reviewCount = reviewStats.counts.get(game.id) ?? 0;
  const ratingSum = reviewStats.ratingSums.get(game.id) ?? 0;
  const totals: AnalyticsTotals = {
    upvotes: upvoteMap.get(game.id) ?? 0,
    pageViews: lifetime ? asCount(game.pageViews) : (rollup?.pageViews ?? 0),
    linkClicks: lifetime ? asCount(game.outboundClicks) : (rollup?.linkClicks ?? 0),
    likes: likeCounts.get(game.id) ?? 0,
    bookmarks: bookmarkCounts.get(game.id) ?? 0,
    reviewCount,
    reviewAverage: reviewCount > 0 ? ratingSum / reviewCount : null,
  };

  let previous: AnalyticsTotals | null = null;
  if (previousDaily && previousUpvotes && previousLikes && previousBookmarks && previousReviews) {
    const prev = previousDaily.byGame.get(game.id);
    const prevReviewCount = previousReviews.counts.get(game.id) ?? 0;
    const prevRatingSum = previousReviews.ratingSums.get(game.id) ?? 0;
    previous = {
      pageViews: prev?.pageViews ?? 0,
      linkClicks: prev?.linkClicks ?? 0,
      upvotes: previousUpvotes.get(game.id) ?? 0,
      likes: previousLikes.get(game.id) ?? 0,
      bookmarks: previousBookmarks.get(game.id) ?? 0,
      reviewCount: prevReviewCount,
      reviewAverage: prevReviewCount > 0 ? prevRatingSum / prevReviewCount : null,
    };
  }

  const deltas = buildMetricDeltas(totals, previous);
  const clickMap = daily.clickMaps.get(game.id) ?? new Map<string, number>();

  let clicks: AnalyticsClickRow[];
  if (lifetime) {
    const allDaily = await sumDailyForGames([game.id], buildAllWindow());
    clicks = clickRowsFromMap(
      allDaily.clickMaps.get(game.id) ?? new Map(),
      asCount(game.outboundClicks),
    );
  } else {
    clicks = clickRowsFromMap(clickMap, 0);
  }

  const launches = listings.length === 0 ? [] : await launchesForGame(game.id, listings);

  return {
    slug: game.slug,
    name: game.name,
    coverUrl: game.coverUrl,
    archived: Boolean(game.archivedAt),
    range: window.key,
    start: window.start,
    end: window.end,
    periodLabel: formatPeriodLabel(window),
    hasLaunchRange,
    totals,
    previous,
    deltas,
    series: daily.series,
    countries: topCountriesFromMap(daily.countries),
    launches,
    clicks,
  };
}

async function launchesForGame(
  gameId: string,
  listings: Array<{ isoYear: number; isoWeek: number }>,
): Promise<AnalyticsLaunch[]> {
  const db = getDb();
  const [peers, ownVotes] = await Promise.all([
    db
      .select({
        isoYear: weekListings.isoYear,
        isoWeek: weekListings.isoWeek,
        gameId: games.id,
        name: games.name,
        voteCount: sql<number>`count(${votes.id})::int`,
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
          weekTupleFilter(weekListings.isoYear, weekListings.isoWeek, listings),
          sql`${games.archivedAt} is null`,
        ),
      )
      .groupBy(weekListings.isoYear, weekListings.isoWeek, games.id, games.name),
    db
      .select({
        isoYear: votes.isoYear,
        isoWeek: votes.isoWeek,
        voteCount: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(and(eq(votes.gameId, gameId), weekTupleFilter(votes.isoYear, votes.isoWeek, listings)))
      .groupBy(votes.isoYear, votes.isoWeek),
  ]);

  const peersByWeek = new Map<string, Array<{ gameId: string; name: string; voteCount: number }>>();
  for (const peer of peers) {
    const key = weekKey(peer.isoYear, peer.isoWeek);
    const list = peersByWeek.get(key) ?? [];
    list.push({ gameId: peer.gameId, name: peer.name, voteCount: asCount(peer.voteCount) });
    peersByWeek.set(key, list);
  }

  const votesByWeek = new Map(
    ownVotes.map((row) => [weekKey(row.isoYear, row.isoWeek), asCount(row.voteCount)]),
  );

  return listings.map((listing) => {
    const key = weekKey(listing.isoYear, listing.isoWeek);
    const weekPeers = peersByWeek.get(key) ?? [];
    const rank = rankOnWeek(weekPeers, gameId);
    const listed = weekPeers.find((peer) => peer.gameId === gameId);
    return {
      year: listing.isoYear,
      week: listing.isoWeek,
      live: isIsoWeekLive(listing.isoYear, listing.isoWeek),
      rank,
      voteCount: votesByWeek.get(key) ?? listed?.voteCount ?? 0,
    };
  });
}
