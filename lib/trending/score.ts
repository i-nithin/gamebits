import { TREND_WEIGHTS, type RegimeParams } from "@/lib/trending/config";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const FRESHNESS_DAYS = 10;
const WILSON_Z = 1.96;

export type TrendEventKind = "visitor" | "click" | "like" | "bookmark" | "vote" | "review";

export type TrendEvent = {
  gameId: string;
  kind: TrendEventKind;
  at: Date;
  rating?: number;
  count?: number;
};

export type TrendActorEvent = TrendEvent & {
  actorId?: string | null;
  ownerId?: string | null;
};

export type TrendGameInput = {
  id: string;
  createdAt: Date;
  ownerKey: string;
};

export type ScoredTrendGame = {
  gameId: string;
  score: number;
  rank: number;
  hot: number;
  baseline: number;
  velocity: number;
};

export type TrendScoreWindow = {
  hotStart: Date;
  hotEnd: Date;
  baseStart: Date;
  halfLifeHours: number;
};

export function withoutOwnerEvents<T extends TrendActorEvent>(events: T[]): T[] {
  return events.filter(
    (event) => !event.actorId || !event.ownerId || event.actorId !== event.ownerId,
  );
}

export function positiveActivity(events: TrendEvent[], start: Date, end: Date): number {
  const byGame = groupEvents(events);
  let total = 0;
  for (const gameEvents of byGame.values()) {
    total += weightedSum(gameEvents, start, end, true, null);
  }
  return total;
}

export function scoreTrendingGames(input: {
  now: Date;
  games: TrendGameInput[];
  events: TrendEvent[];
  regime: RegimeParams;
  window?: TrendScoreWindow;
}): ScoredTrendGame[] {
  const { regime } = input;
  const windowMs = regime.windowDays * DAY_MS;
  const hotEnd = input.window?.hotEnd ?? input.now;
  const hotStart = input.window?.hotStart ?? new Date(hotEnd.getTime() - windowMs);
  const baseStart = input.window?.baseStart ?? new Date(hotStart.getTime() - windowMs);
  const halfLifeHours = input.window?.halfLifeHours ?? regime.halfLifeHours;
  const byGame = groupEvents(input.events);
  const seen = new Set<string>();

  const scored = input.games.flatMap((game) => {
    if (seen.has(game.id)) return [];
    seen.add(game.id);
    const gameEvents = byGame.get(game.id) ?? [];
    const hot = weightedSum(gameEvents, hotStart, hotEnd, true, halfLifeHours);
    const baseline = weightedSum(gameEvents, baseStart, hotStart, false, halfLifeHours);
    const velocity = (hot + regime.prior) / (baseline + regime.prior);
    const quality = qualityMultiplier(reviewRatings(gameEvents, hotStart, hotEnd));
    const ageDays = Math.max(0, (hotEnd.getTime() - game.createdAt.getTime()) / DAY_MS);
    const freshness = regime.freshnessWeight * Math.exp(-ageDays / FRESHNESS_DAYS);
    return [
      {
        id: game.id,
        ownerKey: game.ownerKey,
        createdAt: game.createdAt,
        hot,
        baseline,
        velocity,
        score: Math.log1p(hot) * velocity * quality + freshness,
      },
    ];
  });

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const created = b.createdAt.getTime() - a.createdAt.getTime();
    if (created !== 0) return created;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return diversify(scored, regime.developerCap).map((game, index) => ({
    gameId: game.id,
    score: game.score,
    rank: index + 1,
    hot: game.hot,
    baseline: game.baseline,
    velocity: game.velocity,
  }));
}

export function regimeWindow(regime: RegimeParams, now: Date) {
  const windowMs = regime.windowDays * DAY_MS;
  return {
    hotStart: new Date(now.getTime() - windowMs),
    hotEnd: now,
  };
}

function groupEvents(events: TrendEvent[]) {
  const map = new Map<string, TrendEvent[]>();
  for (const event of events) {
    const list = map.get(event.gameId);
    if (list) list.push(event);
    else map.set(event.gameId, [event]);
  }
  return map;
}

function eventCount(event: TrendEvent) {
  return event.count ?? 1;
}

function positiveWeight(event: TrendEvent) {
  const count = eventCount(event);
  switch (event.kind) {
    case "visitor":
      return TREND_WEIGHTS.visitor * count;
    case "click":
      return TREND_WEIGHTS.click * count;
    case "like":
      return TREND_WEIGHTS.like * count;
    case "bookmark":
      return TREND_WEIGHTS.bookmark * count;
    case "vote":
      return TREND_WEIGHTS.vote * count;
    case "review": {
      const rating = clampRating(event.rating ?? 3);
      const sentiment = (rating - 3) / 2;
      return TREND_WEIGHTS.review * Math.max(0, sentiment) * count;
    }
  }
}

function clampRating(rating: number) {
  return Math.min(5, Math.max(1, rating));
}

function inRange(at: Date, start: Date, end: Date, endInclusive: boolean) {
  if (at.getTime() < start.getTime()) return false;
  return endInclusive ? at.getTime() <= end.getTime() : at.getTime() < end.getTime();
}

function weightedSum(
  events: TrendEvent[],
  start: Date,
  end: Date,
  endInclusive: boolean,
  halfLifeHours: number | null,
) {
  let visitors = 0;
  let clicks = 0;
  const chosen: TrendEvent[] = [];
  for (const event of events) {
    if (!inRange(event.at, start, end, endInclusive)) continue;
    chosen.push(event);
    const count = eventCount(event);
    if (event.kind === "visitor") visitors += count;
    else if (event.kind === "click") clicks += count;
  }
  const clickScale = clicks === 0 ? 1 : Math.min(1, (2 * visitors) / clicks);
  let sum = 0;
  for (const event of chosen) {
    let weight = positiveWeight(event);
    if (event.kind === "click") weight *= clickScale;
    if (weight === 0) continue;
    if (halfLifeHours === null) {
      sum += weight;
      continue;
    }
    const ageHours = (end.getTime() - event.at.getTime()) / HOUR_MS;
    sum += weight * 0.5 ** (ageHours / halfLifeHours);
  }
  return sum;
}

function reviewRatings(events: TrendEvent[], start: Date, end: Date) {
  const ratings: number[] = [];
  for (const event of events) {
    if (event.kind !== "review" || !inRange(event.at, start, end, true)) continue;
    const rating = clampRating(event.rating ?? 3);
    const count = eventCount(event);
    for (let index = 0; index < count; index += 1) ratings.push(rating);
  }
  return ratings;
}

function qualityMultiplier(ratings: number[]) {
  if (ratings.length === 0) return 1;
  const positive = ratings.filter((rating) => rating >= 4).length;
  return 0.7 + wilsonLower(positive, ratings.length) * 0.45;
}

function wilsonLower(successes: number, total: number) {
  if (total <= 0) return 0;
  const proportion = successes / total;
  const z2 = WILSON_Z * WILSON_Z;
  const denominator = 1 + z2 / total;
  const center = proportion + z2 / (2 * total);
  const margin = WILSON_Z * Math.sqrt((proportion * (1 - proportion) + z2 / (4 * total)) / total);
  return Math.max(0, (center - margin) / denominator);
}

function diversify<T extends { ownerKey: string }>(games: T[], cap: number) {
  if (!Number.isFinite(cap)) return games;
  const selected: T[] = [];
  const deferred: T[] = [];
  const counts = new Map<string, number>();
  for (const game of games) {
    const used = counts.get(game.ownerKey) ?? 0;
    if (used >= cap) {
      deferred.push(game);
      continue;
    }
    selected.push(game);
    counts.set(game.ownerKey, used + 1);
  }
  return [...selected, ...deferred];
}
