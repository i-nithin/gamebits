import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sparklinePoints } from "./sparkline";
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
