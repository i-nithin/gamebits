import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { cache } from "react";

import {
  bookmarks,
  gameAnalyticsDaily,
  gameAnalyticsVisitors,
  gameReviews,
  games,
  likes,
  trendSnapshotRanks,
  trendSnapshots,
  trendState,
  votes,
} from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import {
  REGIMES,
  TREND_LOCK_KEY,
  TREND_LOOKBACK_DAYS,
  TREND_STALE_MS,
  TREND_STATE_ID,
  selectRegime,
  type RegimeParams,
  type TrendRegime,
} from "@/lib/trending/config";
import { trendPeriods, trendRangePeriod, type TrendPeriodWindow } from "@/lib/trending/periods";
import {
  positiveActivity,
  regimeWindow,
  scoreTrendingGames,
  withoutOwnerEvents,
  type TrendActorEvent,
  type TrendGameInput,
} from "@/lib/trending/score";

const DAY_MS = 86_400_000;
const INSERT_CHUNK = 400;

export type TrendRecomputeResult =
  | { recomputed: false; reason: "no-database" | "locked" | "fresh" }
  | { recomputed: true; regime: TrendRegime; gameCount: number; eventMass: number };

export const ensureFreshTrends = cache(async function ensureFreshTrends() {
  if (!hasDatabase()) return;
  const db = getDb();
  const [state] = await db
    .select({ computedAt: trendState.computedAt })
    .from(trendState)
    .where(eq(trendState.id, TREND_STATE_ID))
    .limit(1);
  const fresh = Boolean(state && Date.now() - state.computedAt.getTime() < TREND_STALE_MS);
  if (fresh) {
    const today = trendRangePeriod("today");
    const [snapshot] = await db
      .select({ id: trendSnapshots.id })
      .from(trendSnapshots)
      .where(and(eq(trendSnapshots.kind, today.kind), eq(trendSnapshots.periodKey, today.key)))
      .limit(1);
    if (snapshot) return;
    await recomputeTrends();
    return;
  }
  await recomputeTrends({ onlyIfStale: true });
});

export async function recomputeTrends(opts?: {
  onlyIfStale?: boolean;
}): Promise<TrendRecomputeResult> {
  if (!hasDatabase()) return { recomputed: false, reason: "no-database" };
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(${TREND_LOCK_KEY}::bigint) as locked`,
    );
    if (locked.rows[0]?.locked !== true) return { recomputed: false, reason: "locked" };

    const [state] = await tx
      .select({
        regime: trendState.regime,
        computedAt: trendState.computedAt,
      })
      .from(trendState)
      .where(eq(trendState.id, TREND_STATE_ID))
      .limit(1);

    const now = new Date();
    if (
      opts?.onlyIfStale &&
      state &&
      now.getTime() - state.computedAt.getTime() < TREND_STALE_MS
    ) {
      return { recomputed: false, reason: "fresh" };
    }

    const previous = state?.regime ?? null;
    const since = new Date(now.getTime() - TREND_LOOKBACK_DAYS * DAY_MS);
    const sinceDay = since.toISOString().slice(0, 10);
    const liveGames = await tx
      .select({
        id: games.id,
        createdAt: games.createdAt,
        ownerClerkUserId: games.ownerClerkUserId,
        developerName: games.developerName,
      })
      .from(games)
      .where(isNull(games.archivedAt));

    const owners = new Map(liveGames.map((game) => [game.id, game.ownerClerkUserId]));
    const events = withoutOwnerEvents(
      await loadEvents(tx, since, sinceDay, now, owners),
    );
    const probe = REGIMES[previous ?? "sparse"];
    const activity = positiveActivity(events, regimeWindow(probe, now).hotStart, now);
    const regime = selectRegime(liveGames.length, activity, previous);
    const params = REGIMES[regime];
    const gameInputs = liveGames.map((game) => ({
      id: game.id,
      createdAt: game.createdAt,
      ownerKey: game.ownerClerkUserId ?? `dev:${game.developerName}`,
    }));
    for (const period of trendPeriods(now)) {
      await writePeriodSnapshot(tx, period, gameInputs, events, params, regime, now);
    }
    await tx
      .insert(trendState)
      .values({
        id: TREND_STATE_ID,
        regime,
        previousRegime: previous,
        gameCount: liveGames.length,
        eventMass: activity,
        windowDays: params.windowDays,
        halfLifeHours: params.halfLifeHours,
        priorStrength: params.prior,
        computedAt: now,
      })
      .onConflictDoUpdate({
        target: trendState.id,
        set: {
          regime,
          previousRegime: previous,
          gameCount: liveGames.length,
          eventMass: activity,
          windowDays: params.windowDays,
          halfLifeHours: params.halfLifeHours,
          priorStrength: params.prior,
          computedAt: now,
        },
      });

    return {
      recomputed: true,
      regime,
      gameCount: liveGames.length,
      eventMass: activity,
    };
  });
}

async function writePeriodSnapshot(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  period: TrendPeriodWindow,
  games: TrendGameInput[],
  events: TrendActorEvent[],
  params: RegimeParams,
  regime: TrendRegime,
  now: Date,
) {
  const [existing] = await tx
    .select({ id: trendSnapshots.id, sealedAt: trendSnapshots.sealedAt })
    .from(trendSnapshots)
    .where(and(eq(trendSnapshots.kind, period.kind), eq(trendSnapshots.periodKey, period.key)))
    .limit(1);
  if (existing?.sealedAt) return;

  const scored = scoreTrendingGames({ now, regime: params, window: period, games, events });
  const values = {
    kind: period.kind,
    periodKey: period.key,
    startsAt: period.hotStart,
    endsAt: period.hotEnd,
    sealedAt: period.sealed ? now : null,
    gameCount: games.length,
    eventMass: positiveActivity(events, period.hotStart, period.hotEnd),
    regime,
    computedAt: now,
  };
  const snapshotId = existing
    ? existing.id
    : (
        await tx.insert(trendSnapshots).values(values).returning({ id: trendSnapshots.id })
      )[0]?.id;
  if (!snapshotId) return;
  if (existing) {
    await tx.update(trendSnapshots).set(values).where(eq(trendSnapshots.id, existing.id));
    await tx.delete(trendSnapshotRanks).where(eq(trendSnapshotRanks.snapshotId, existing.id));
  }
  for (let index = 0; index < scored.length; index += INSERT_CHUNK) {
    await tx.insert(trendSnapshotRanks).values(
      scored.slice(index, index + INSERT_CHUNK).map((row) => ({
        snapshotId,
        gameId: row.gameId,
        rank: row.rank,
        score: row.score,
        hot: row.hot,
        baseline: row.baseline,
        velocity: row.velocity,
      })),
    );
  }
}

async function loadEvents(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  since: Date,
  sinceDay: string,
  now: Date,
  owners: Map<string, string | null>,
): Promise<TrendActorEvent[]> {
  const visitorRows = await tx
    .select({
      gameId: gameAnalyticsVisitors.gameId,
      day: gameAnalyticsVisitors.day,
      count: sql<number>`count(*)::int`,
    })
    .from(gameAnalyticsVisitors)
    .where(gte(gameAnalyticsVisitors.day, sinceDay))
    .groupBy(gameAnalyticsVisitors.gameId, gameAnalyticsVisitors.day);
  const clickRows = await tx
    .select({
      gameId: gameAnalyticsDaily.gameId,
      day: gameAnalyticsDaily.day,
      linkClicks: gameAnalyticsDaily.linkClicks,
    })
    .from(gameAnalyticsDaily)
    .where(gte(gameAnalyticsDaily.day, sinceDay));
  const likeRows = await tx
    .select({
      gameId: likes.gameId,
      actorId: likes.clerkUserId,
      at: likes.createdAt,
    })
    .from(likes)
    .where(gte(likes.createdAt, since));
  const bookmarkRows = await tx
    .select({
      gameId: bookmarks.gameId,
      actorId: bookmarks.clerkUserId,
      at: bookmarks.createdAt,
    })
    .from(bookmarks)
    .where(gte(bookmarks.createdAt, since));
  const voteRows = await tx
    .select({
      gameId: votes.gameId,
      actorId: votes.clerkUserId,
      at: votes.createdAt,
    })
    .from(votes)
    .where(gte(votes.createdAt, since));
  const reviewRows = await tx
    .select({
      gameId: gameReviews.gameId,
      actorId: gameReviews.clerkUserId,
      at: gameReviews.createdAt,
      rating: gameReviews.rating,
    })
    .from(gameReviews)
    .where(and(gte(gameReviews.createdAt, since), isNull(gameReviews.removedAt)));

  const events: TrendActorEvent[] = [];
  for (const row of visitorRows) {
    const count = Number(row.count);
    if (!owners.has(row.gameId) || count <= 0) continue;
    events.push({
      gameId: row.gameId,
      kind: "visitor",
      at: instantForDay(row.day, now),
      count,
      ownerId: owners.get(row.gameId),
    });
  }
  for (const row of clickRows) {
    if (!owners.has(row.gameId) || row.linkClicks <= 0) continue;
    events.push({
      gameId: row.gameId,
      kind: "click",
      at: instantForDay(row.day, now),
      count: row.linkClicks,
      ownerId: owners.get(row.gameId),
    });
  }
  pushActions(events, owners, likeRows, "like");
  pushActions(events, owners, bookmarkRows, "bookmark");
  pushActions(events, owners, voteRows, "vote");
  for (const row of reviewRows) {
    if (!owners.has(row.gameId)) continue;
    events.push({
      gameId: row.gameId,
      kind: "review",
      at: row.at,
      rating: row.rating,
      actorId: row.actorId,
      ownerId: owners.get(row.gameId),
    });
  }
  return events;
}

function pushActions(
  events: TrendActorEvent[],
  owners: Map<string, string | null>,
  rows: Array<{ gameId: string; actorId: string; at: Date }>,
  kind: "like" | "bookmark" | "vote",
) {
  for (const row of rows) {
    if (!owners.has(row.gameId)) continue;
    events.push({
      gameId: row.gameId,
      kind,
      at: row.at,
      actorId: row.actorId,
      ownerId: owners.get(row.gameId),
    });
  }
}

function instantForDay(day: string, now: Date) {
  const noon = new Date(`${day}T12:00:00.000Z`);
  return noon.getTime() > now.getTime() ? now : noon;
}
