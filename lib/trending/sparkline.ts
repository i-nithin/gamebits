import { positiveWeight, type TrendEvent } from "./score";

export const SPARKLINE_BUCKETS = 6;

export function sparklinePoints(
  events: TrendEvent[],
  start: Date,
  end: Date,
  buckets = SPARKLINE_BUCKETS,
): number[] {
  const points = Array.from({ length: Math.max(0, buckets) }, () => 0);
  if (points.length === 0) return points;

  const startMs = start.getTime();
  const span = end.getTime() - startMs;
  if (span <= 0) return points;

  for (const event of events) {
    const at = event.at.getTime();
    if (at < startMs || at > end.getTime()) continue;
    let index = Math.floor(((at - startMs) / span) * points.length);
    if (index >= points.length) index = points.length - 1;
    points[index] += positiveWeight(event);
  }

  return points;
}

/** Net direction of a sparkline. Flat and rising series stay green; only a drop is red. */
export function sparklineDirection(points: number[]): "up" | "flat" | "down" {
  if (points.length < 2) return "flat";
  const delta = points[points.length - 1] - points[0];
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function trendLineClass(points: number[]) {
  return sparklineDirection(points) === "down" ? "text-error" : "text-trend";
}

export function trendLineColor(points: number[]) {
  return sparklineDirection(points) === "down" ? "var(--gb-error)" : "var(--gb-trend)";
}

export function sparklinePolyline(points: number[], width = 52, height = 22, pad = 2) {
  if (points.length === 0) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  return points
    .map((value, index) => {
      const x = pad + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
      const y = span === 0 ? pad + innerH / 2 : pad + innerH - ((value - min) / span) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}
