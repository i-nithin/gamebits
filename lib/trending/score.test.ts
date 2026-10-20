import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REGIMES, selectRegime } from "./config";
import { trendPeriods } from "./periods";
import { scoreTrendingGames, withoutOwnerEvents, type TrendEvent } from "./score";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function hoursAgo(hours: number) {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

function game(id: string, createdAt: Date, ownerKey = id) {
  return { id, createdAt, ownerKey };
}

describe("scoreTrendingGames", () => {
  it("sorts newest first when nobody has interacted", () => {
    const scored = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.sparse,
      games: [
        game("old", new Date("2026-05-01T00:00:00.000Z")),
        game("new", new Date("2026-06-14T00:00:00.000Z")),
        game("mid", new Date("2026-06-01T00:00:00.000Z")),
      ],
      events: [],
    });

    assert.deepEqual(
      scored.map((row) => row.gameId),
      ["new", "mid", "old"],
    );
  });

  it("ranks a recent like above a newer game with no activity", () => {
    const scored = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.sparse,
      games: [
        game("liked", hoursAgo(48)),
        game("fresh", hoursAgo(1)),
      ],
      events: [{ gameId: "liked", kind: "like", at: NOW }],
    });

    assert.equal(scored[0]?.gameId, "liked");
    assert.ok((scored[0]?.score ?? 0) > (scored[1]?.score ?? 0));
  });

  it("ranks a spike above a flat game in the mature regime", () => {
    const flat: TrendEvent[] = [];
    for (let day = 0; day < 14; day += 1) {
      flat.push({ gameId: "flat", kind: "like", at: hoursAgo(12 + day * 24) });
    }
    const spike: TrendEvent[] = Array.from({ length: 8 }, () => ({
      gameId: "spike",
      kind: "like" as const,
      at: hoursAgo(1),
    }));

    const scored = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.mature,
      games: [game("flat", hoursAgo(24 * 40)), game("spike", hoursAgo(24 * 40))],
      events: [...flat, ...spike],
    });

    assert.equal(scored[0]?.gameId, "spike");
    assert.ok((scored[0]?.velocity ?? 0) > (scored[1]?.velocity ?? 0));
  });

  it("does not raise a score for a 1-star review", () => {
    const createdAt = new Date("2026-06-01T00:00:00.000Z");
    const visitors: TrendEvent[] = Array.from({ length: 5 }, () => ({
      gameId: "plain",
      kind: "visitor" as const,
      at: NOW,
    }));
    const pannedVisitors: TrendEvent[] = visitors.map((event) => ({
      ...event,
      gameId: "panned",
    }));
    const scored = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.sparse,
      games: [game("plain", createdAt), game("panned", createdAt)],
      events: [
        ...visitors,
        ...pannedVisitors,
        { gameId: "panned", kind: "review", at: NOW, rating: 1 },
      ],
    });
    const plain = scored.find((row) => row.gameId === "plain");
    const panned = scored.find((row) => row.gameId === "panned");
    assert.ok(plain && panned);
    assert.ok(panned.score <= plain.score);
  });

  it("ignores today's events when scoring yesterday", () => {
    const yesterday = trendPeriods(NOW).find((period) => period.kind === "day" && period.sealed);
    assert.ok(yesterday);
    const empty = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.sparse,
      window: yesterday,
      games: [game("g", new Date("2026-01-01T00:00:00.000Z"))],
      events: [],
    });
    const withToday = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.sparse,
      window: yesterday,
      games: [game("g", new Date("2026-01-01T00:00:00.000Z"))],
      events: [{ gameId: "g", kind: "like", at: NOW }],
    });

    assert.equal(withToday[0]?.hot, empty[0]?.hot);
    assert.equal(withToday[0]?.baseline, empty[0]?.baseline);
    assert.equal(withToday[0]?.score, empty[0]?.score);
  });

  it("ignores the week before last when scoring this week", () => {
    const week = trendPeriods(NOW).find((period) => period.kind === "week" && !period.sealed);
    assert.ok(week);
    const older = new Date(week.baseStart.getTime() - 3_600_000);
    const empty = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.mature,
      window: week,
      games: [game("g", new Date("2026-01-01T00:00:00.000Z"))],
      events: [],
    });
    const withOlder = scoreTrendingGames({
      now: NOW,
      regime: REGIMES.mature,
      window: week,
      games: [game("g", new Date("2026-01-01T00:00:00.000Z"))],
      events: [{ gameId: "g", kind: "like", at: older }],
    });

    assert.ok(older < week.baseStart);
    assert.equal(withOlder[0]?.hot, empty[0]?.hot);
    assert.equal(withOlder[0]?.baseline, empty[0]?.baseline);
  });
});

describe("withoutOwnerEvents", () => {
  it("drops the owner's own actions before scoring", () => {
    const kept = withoutOwnerEvents([
      {
        gameId: "g",
        kind: "like",
        at: NOW,
        actorId: "owner",
        ownerId: "owner",
      },
      {
        gameId: "g",
        kind: "like",
        at: NOW,
        actorId: "fan",
        ownerId: "owner",
      },
      {
        gameId: "g",
        kind: "visitor",
        at: NOW,
        actorId: null,
        ownerId: "owner",
      },
    ]);

    assert.equal(kept.length, 2);
    assert.equal(kept[0]?.actorId, "fan");
    assert.equal(kept[1]?.kind, "visitor");
  });
});

describe("selectRegime", () => {
  it("stays sparse until both catalog and activity clear the growing bar", () => {
    assert.equal(selectRegime(11, 100, null), "sparse");
    assert.equal(selectRegime(12, 19, "sparse"), "sparse");
    assert.equal(selectRegime(12, 20, "sparse"), "growing");
  });

  it("uses hysteresis when leaving a regime", () => {
    assert.equal(selectRegime(11, 15, "growing"), "growing");
    assert.equal(selectRegime(9, 100, "growing"), "sparse");
    assert.equal(selectRegime(80, 200, "growing"), "mature");
    assert.equal(selectRegime(70, 150, "mature"), "mature");
    assert.equal(selectRegime(50, 500, "mature"), "growing");
    assert.equal(selectRegime(5, 5, "mature"), "sparse");
  });
});
