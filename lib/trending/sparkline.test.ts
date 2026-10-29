import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sparklineDirection, sparklinePoints } from "./sparkline";
import type { TrendEvent } from "./score";

const START = new Date("2026-06-15T00:00:00.000Z");
const END = new Date("2026-06-15T06:00:00.000Z");

function atHour(hour: number, kind: TrendEvent["kind"] = "vote"): TrendEvent {
  return {
    gameId: "game",
    kind,
    at: new Date(START.getTime() + hour * 3_600_000 + 1_000),
  };
}

describe("sparklinePoints", () => {
  it("puts a spike in the slice that contains it", () => {
    const points = sparklinePoints([atHour(2, "like")], START, END, 6);
    assert.deepEqual(points, [0, 0, 4, 0, 0, 0]);
  });

  it("returns zeros when nothing happened", () => {
    assert.deepEqual(sparklinePoints([], START, END, 6), [0, 0, 0, 0, 0, 0]);
  });

  it("keeps equal slices equal", () => {
    const events = [0, 1, 2, 3, 4, 5].map((hour) => atHour(hour));
    assert.deepEqual(sparklinePoints(events, START, END, 6), [6, 6, 6, 6, 6, 6]);
  });
});

describe("sparklineDirection", () => {
  it("treats a rise and a flat line as not down", () => {
    assert.equal(sparklineDirection([0, 1, 4]), "up");
    assert.equal(sparklineDirection([2, 2, 2]), "flat");
    assert.equal(sparklineDirection([1]), "flat");
    assert.equal(sparklineDirection([]), "flat");
  });

  it("marks a line that finishes lower as down", () => {
    assert.equal(sparklineDirection([4, 3, 1]), "down");
  });
});
