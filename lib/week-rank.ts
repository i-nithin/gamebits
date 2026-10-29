import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { games, votes, weekListings } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import {
  compareIsoWeek,
  getIsoWeekUtc,
  hasIsoWeekEnded,
  isoWeekRangeUtc,
} from "@/lib/iso-week";

export function voteCountsForRank(
  vote: { rankingAt: Date; withdrawnAt: Date | null },
  weekEnd: Date,
) {
  if (vote.rankingAt.getTime() > weekEnd.getTime()) return false;
  if (vote.withdrawnAt && vote.withdrawnAt.getTime() <= weekEnd.getTime()) return false;
  return true;
}

export function nextRevoteStamp(
  existing: { rankingAt: Date; withdrawnAt: Date | null },
  weekEnd: Date,
  now: Date,
): { rankingAt: Date; createdAt: Date; withdrawnAt: null } {
  const activeAtClose =
    existing.rankingAt.getTime() <= weekEnd.getTime() &&
    existing.withdrawnAt != null &&
    existing.withdrawnAt.getTime() > weekEnd.getTime();

  if (activeAtClose) {
    return { rankingAt: existing.rankingAt, createdAt: now, withdrawnAt: null };
  }

  return { rankingAt: now, createdAt: now, withdrawnAt: null };
}

type ListingRankRow = {
  id: string;
  gameId: string;
  name: string;
  archivedAt: Date | null;
  finalRank: number | null;
  snapshottedAt: Date | null;
};

export function boardRankMode(ended: boolean, finalRanks: Array<number | null>) {
  return ended && finalRanks.every((rank) => rank != null) ? "frozen" : "live";
}

export function weekCacheSeconds(ranksFrozen: boolean) {
  return ranksFrozen ? 300 : 30;
}

export function ranksForSnapshot(
  listings: ListingRankRow[],
  countByGame: Map<string, number>,
) {
  const alreadySnapshotted = listings.some((row) => row.snapshottedAt);
  const maxRank = listings.reduce((max, row) => Math.max(max, row.finalRank ?? 0), 0);
  const pending = listings.filter(
    (row) => !row.snapshottedAt || (row.finalRank == null && !row.archivedAt),
  );
  const storedCount = (row: ListingRankRow) =>
    !row.snapshottedAt && alreadySnapshotted ? 0 : (countByGame.get(row.gameId) ?? 0);

  const visible = pending
    .filter((row) => !row.archivedAt)
    .toSorted((a, b) => {
      const delta = storedCount(b) - storedCount(a);
      if (delta !== 0) return delta;
      return a.name.localeCompare(b.name);
    });

  const rankById = new Map<string, number>();
  let nextRank = alreadySnapshotted ? maxRank + 1 : 1;
  for (const row of visible) {
    rankById.set(row.id, nextRank);
    nextRank += 1;
  }

  return pending.map((row) => ({
    id: row.id,
    finalRank: rankById.get(row.id) ?? null,
    rankVoteCount: storedCount(row),
    keepSnapshottedAt: row.snapshottedAt != null,
  }));
}

export async function ensureWeekRankSnapshot(year: number, week: number, now = new Date()) {
  if (!hasDatabase() || !hasIsoWeekEnded(year, week, now)) return;
  const db = getDb();
  const { end } = isoWeekRangeUtc(year, week);

  await db.transaction(async (tx) => {
    const listings = await tx
      .select({
        id: weekListings.id,
        gameId: weekListings.gameId,
        finalRank: weekListings.finalRank,
        snapshottedAt: weekListings.snapshottedAt,
      })
      .from(weekListings)
      .where(and(eq(weekListings.isoYear, year), eq(weekListings.isoWeek, week)))
      .for("update");

    if (listings.length === 0) return;

    const gameRows = await tx
      .select({
        id: games.id,
        name: games.name,
        archivedAt: games.archivedAt,
      })
      .from(games)
      .where(inArray(games.id, listings.map((row) => row.gameId)));
    const gameById = new Map(gameRows.map((row) => [row.id, row]));
    const rankedListings: ListingRankRow[] = [];
    for (const row of listings) {
      const game = gameById.get(row.gameId);
      if (!game) continue;
      rankedListings.push({
        id: row.id,
        gameId: row.gameId,
        name: game.name,
        archivedAt: game.archivedAt,
        finalRank: row.finalRank,
        snapshottedAt: row.snapshottedAt,
      });
    }

    const pendingIds = new Set(
      rankedListings
        .filter((row) => !row.snapshottedAt || (row.finalRank == null && !row.archivedAt))
        .map((row) => row.gameId),
    );
    if (pendingIds.size === 0) return;

    const counts = await tx
      .select({
        gameId: votes.gameId,
        count: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(
        and(
          eq(votes.isoYear, year),
          eq(votes.isoWeek, week),
          inArray(votes.gameId, [...pendingIds]),
          lte(votes.rankingAt, end),
          or(isNull(votes.withdrawnAt), gt(votes.withdrawnAt, end)),
        ),
      )
      .groupBy(votes.gameId);

    const countByGame = new Map(counts.map((row) => [row.gameId, Number(row.count)]));
    const assignments = ranksForSnapshot(rankedListings, countByGame);
    const stamped = new Date();

    for (const assignment of assignments) {
      await tx
        .update(weekListings)
        .set({
          finalRank: assignment.finalRank,
          rankVoteCount: assignment.rankVoteCount,
          ...(assignment.keepSnapshottedAt ? {} : { snapshottedAt: stamped }),
        })
        .where(
          and(
            eq(weekListings.id, assignment.id),
            assignment.keepSnapshottedAt
              ? isNull(weekListings.finalRank)
              : isNull(weekListings.snapshottedAt),
          ),
        );
    }
  });
}

export async function snapshotClosedWeeks(now = new Date()) {
  if (!hasDatabase()) return { weeks: 0 };
  const current = getIsoWeekUtc(now);
  const db = getDb();
  const rows = await db
    .selectDistinct({
      isoYear: weekListings.isoYear,
      isoWeek: weekListings.isoWeek,
    })
    .from(weekListings)
    .where(isNull(weekListings.snapshottedAt));

  const closed = rows.filter(
    (row) => compareIsoWeek({ year: row.isoYear, week: row.isoWeek }, current) < 0,
  );
  for (const week of closed) {
    await ensureWeekRankSnapshot(week.isoYear, week.isoWeek, now);
  }
  return { weeks: closed.length };
}
