import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getIsoWeekUtc, isoWeekRangeUtc } from "./iso-week";
import { nextRevoteStamp, ranksForSnapshot, voteCountsForRank } from "./week-rank";

const DURING = new Date("2026-06-17T12:00:00.000Z");
const WEEK = getIsoWeekUtc(DURING);
const { end: WEEK_END } = isoWeekRangeUtc(WEEK.year, WEEK.week);
const AFTER = new Date(WEEK_END.getTime() + 60_000);

describe("voteCountsForRank", () => {
  it("counts a vote cast during the launch week", () => {
    assert.equal(
      voteCountsForRank({ rankingAt: DURING, withdrawnAt: null }, WEEK_END),
      true,
    );
  });

  it("ignores a vote withdrawn during the launch week", () => {
    assert.equal(
      voteCountsForRank({ rankingAt: DURING, withdrawnAt: DURING }, WEEK_END),
      false,
    );
  });

  it("keeps a vote that was withdrawn after the week closed", () => {
    assert.equal(
      voteCountsForRank({ rankingAt: DURING, withdrawnAt: AFTER }, WEEK_END),
      true,
    );
  });

  it("ignores a first vote cast after the week closed", () => {
    assert.equal(
      voteCountsForRank({ rankingAt: AFTER, withdrawnAt: null }, WEEK_END),
      false,
    );
  });
});

describe("nextRevoteStamp", () => {
  it("starts a new ranking timestamp when the vote was off before week close", () => {
    const stamp = nextRevoteStamp(
      { rankingAt: DURING, withdrawnAt: DURING },
      WEEK_END,
      AFTER,
    );

    assert.equal(stamp.rankingAt.getTime(), AFTER.getTime());
    assert.equal(stamp.createdAt.getTime(), AFTER.getTime());
    assert.equal(stamp.withdrawnAt, null);
    assert.equal(voteCountsForRank(stamp, WEEK_END), false);
  });

  it("keeps rank credit when a vote that was active at close is cast again", () => {
    const stamp = nextRevoteStamp(
      { rankingAt: DURING, withdrawnAt: AFTER },
      WEEK_END,
      new Date(AFTER.getTime() + 60_000),
    );

    assert.equal(stamp.rankingAt.getTime(), DURING.getTime());
    assert.equal(stamp.withdrawnAt, null);
    assert.equal(voteCountsForRank(stamp, WEEK_END), true);
  });

  it("refreshes the ranking timestamp for a revote during the live week", () => {
    const later = new Date(DURING.getTime() + 3_600_000);
    const stamp = nextRevoteStamp(
      { rankingAt: DURING, withdrawnAt: DURING },
      WEEK_END,
      later,
    );

    assert.equal(stamp.rankingAt.getTime(), later.getTime());
    assert.equal(voteCountsForRank(stamp, WEEK_END), true);
  });
});

describe("ranksForSnapshot", () => {
  it("appends a listing added after the snapshot without moving existing places", () => {
    const assigned = ranksForSnapshot(
      [
        {
          id: "listed",
          gameId: "game-a",
          name: "Alpha",
          archivedAt: null,
          finalRank: 1,
          snapshottedAt: WEEK_END,
        },
        {
          id: "added",
          gameId: "game-b",
          name: "Beta",
          archivedAt: null,
          finalRank: null,
          snapshottedAt: null,
        },
      ],
      new Map([
        ["game-a", 10],
        ["game-b", 40],
      ]),
    );

    assert.deepEqual(assigned, [
      {
        id: "added",
        finalRank: 2,
        rankVoteCount: 0,
        keepSnapshottedAt: false,
      },
    ]);
  });
});
