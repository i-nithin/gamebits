import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  bookmarks,
  gameAnalyticsEvents,
  gameReviews,
  games,
  likes,
  votes,
  weekListings,
} from "@/db/schema";
import {
  analyticsLinkLabel,
  compareAnalyticsLinkKind,
  isAnalyticsLinkKind,
  type AnalyticsLinkKind,
} from "@/lib/analytics/links";
import type {
  AnalyticsClickRow,
  AnalyticsGameRow,
  AnalyticsLaunch,
  AnalyticsPortfolio,
  AnalyticsTotals,
  GameAnalytics,
} from "@/lib/analytics/types";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getDb, hasDatabase } from "@/lib/db";
import { isIsoWeekLive } from "@/lib/iso-week";

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

function clickRows(
  outboundClicks: number,
  rows: Array<{ linkKind: string | null; count: number | string }>,
): AnalyticsClickRow[] {
  const known = new Map<AnalyticsLinkKind, number>();
  const unknown: AnalyticsClickRow[] = [];
  let tracked = 0;

  for (const row of rows) {
    const count = asCount(row.count);
    if (count <= 0) continue;
    tracked += count;
    if (row.linkKind && isAnalyticsLinkKind(row.linkKind)) {
      known.set(row.linkKind, (known.get(row.linkKind) ?? 0) + count);
      continue;
    }
    unknown.push({ label: row.linkKind || "Link", count });
  }

  const clicks = [...known.entries()]
    .toSorted((a, b) => compareAnalyticsLinkKind(a[0], b[0]))
    .map(([kind, count]) => ({ label: analyticsLinkLabel(kind), count }));

  clicks.push(...unknown);
  const earlier = Math.max(0, outboundClicks - tracked);
  if (earlier > 0) clicks.push({ label: "Earlier Play clicks", count: earlier });
  return clicks;
}

export async function getAnalyticsPortfolio(userId: string): Promise<AnalyticsPortfolio | null> {
  const sessionUserId = await getCurrentUserId();
  if (!sessionUserId || sessionUserId !== userId || !hasDatabase()) return null;
  const db = getDb();
  const gameRows = await db
    .select({
      id: games.id,
      slug: games.slug,
      name: games.name,
      coverUrl: games.coverUrl,
      archivedAt: games.archivedAt,
      outboundClicks: games.outboundClicks,
    })
    .from(games)
    .where(isAdminUserId(userId) ? sql`true` : eq(games.ownerClerkUserId, userId))
    .orderBy(desc(games.createdAt));

  if (gameRows.length === 0) {
    return { gameCount: 0, totals: emptyTotals(), games: [] };
  }

  const ids = gameRows.map((game) => game.id);
  const [voteRows, viewRows, likeRows, bookmarkRows, reviewRows] = await Promise.all([
    db
      .select({
        gameId: votes.gameId,
        count: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(inArray(votes.gameId, ids))
      .groupBy(votes.gameId),
    db
      .select({
        gameId: gameAnalyticsEvents.gameId,
        count: sql<number>`count(*)::int`,
      })
      .from(gameAnalyticsEvents)
      .where(
        and(inArray(gameAnalyticsEvents.gameId, ids), eq(gameAnalyticsEvents.kind, "page_view")),
      )
      .groupBy(gameAnalyticsEvents.gameId),
    db
      .select({
        gameId: likes.gameId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(inArray(likes.gameId, ids))
      .groupBy(likes.gameId),
    db
      .select({
        gameId: bookmarks.gameId,
        count: sql<number>`count(*)::int`,
      })
      .from(bookmarks)
      .where(inArray(bookmarks.gameId, ids))
      .groupBy(bookmarks.gameId),
    db
      .select({
        gameId: gameReviews.gameId,
        count: sql<number>`count(*)::int`,
        ratingSum: sql<number>`coalesce(sum(${gameReviews.rating}), 0)::int`,
      })
      .from(gameReviews)
      .where(inArray(gameReviews.gameId, ids))
      .groupBy(gameReviews.gameId),
  ]);

  const upvotes = countByGame(voteRows);
  const views = countByGame(viewRows);
  const likeCounts = countByGame(likeRows);
  const bookmarkCounts = countByGame(bookmarkRows);
  const reviewCounts = countByGame(reviewRows);
  let ratingSum = 0;
  for (const row of reviewRows) ratingSum += asCount(row.ratingSum);

  const list: AnalyticsGameRow[] = gameRows.map((game) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    coverUrl: game.coverUrl,
    archived: Boolean(game.archivedAt),
    upvotes: upvotes.get(game.id) ?? 0,
    pageViews: views.get(game.id) ?? 0,
    linkClicks: game.outboundClicks,
  }));

  const totals = list.reduce<AnalyticsTotals>(
    (sum, game) => {
      sum.upvotes += game.upvotes;
      sum.pageViews += game.pageViews;
      sum.linkClicks += game.linkClicks;
      sum.likes += likeCounts.get(game.id) ?? 0;
      sum.bookmarks += bookmarkCounts.get(game.id) ?? 0;
      sum.reviewCount += reviewCounts.get(game.id) ?? 0;
      return sum;
    },
    emptyTotals(),
  );
  totals.reviewAverage = totals.reviewCount > 0 ? ratingSum / totals.reviewCount : null;

  return { gameCount: list.length, totals, games: list };
}

export async function getGameAnalytics(
  userId: string,
  slug: string,
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
      outboundClicks: games.outboundClicks,
      ownerClerkUserId: games.ownerClerkUserId,
    })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);

  if (!game) return null;
  if (!isAdminUserId(userId) && game.ownerClerkUserId !== userId) return null;

  const [voteRows, viewRows, likeRows, bookmarkRows, reviewRows, clickGroups, listings] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(votes)
        .where(eq(votes.gameId, game.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(gameAnalyticsEvents)
        .where(
          and(eq(gameAnalyticsEvents.gameId, game.id), eq(gameAnalyticsEvents.kind, "page_view")),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(likes)
        .where(eq(likes.gameId, game.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(eq(bookmarks.gameId, game.id)),
      db
        .select({
          count: sql<number>`count(*)::int`,
          ratingSum: sql<number>`coalesce(sum(${gameReviews.rating}), 0)::int`,
        })
        .from(gameReviews)
        .where(eq(gameReviews.gameId, game.id)),
      db
        .select({
          linkKind: gameAnalyticsEvents.linkKind,
          count: sql<number>`count(*)::int`,
        })
        .from(gameAnalyticsEvents)
        .where(
          and(eq(gameAnalyticsEvents.gameId, game.id), eq(gameAnalyticsEvents.kind, "link_click")),
        )
        .groupBy(gameAnalyticsEvents.linkKind),
      db
        .select({
          isoYear: weekListings.isoYear,
          isoWeek: weekListings.isoWeek,
        })
        .from(weekListings)
        .where(eq(weekListings.gameId, game.id))
        .orderBy(desc(weekListings.isoYear), desc(weekListings.isoWeek)),
    ]);

  const reviewCount = asCount(reviewRows[0]?.count);
  const ratingSum = asCount(reviewRows[0]?.ratingSum);
  const totals: AnalyticsTotals = {
    upvotes: asCount(voteRows[0]?.count),
    pageViews: asCount(viewRows[0]?.count),
    linkClicks: game.outboundClicks,
    likes: asCount(likeRows[0]?.count),
    bookmarks: asCount(bookmarkRows[0]?.count),
    reviewCount,
    reviewAverage: reviewCount > 0 ? ratingSum / reviewCount : null,
  };

  const launches = listings.length === 0 ? [] : await launchesForGame(game.id, listings);

  return {
    slug: game.slug,
    name: game.name,
    coverUrl: game.coverUrl,
    archived: Boolean(game.archivedAt),
    totals,
    launches,
    clicks: clickRows(game.outboundClicks, clickGroups),
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
