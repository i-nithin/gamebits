import type { AnalyticsDelta, AnalyticsTotals } from "@/lib/analytics/types";

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatAnalyticsCount(value: number) {
  return numberFormat.format(value);
}

export function formatCompactCount(value: number) {
  return compactFormat.format(value);
}

export function formatClickThrough(clicks: number, views: number) {
  if (views <= 0) return "—";
  const percent = (clicks / views) * 100;
  const digits = percent >= 10 ? 0 : 1;
  return `${percent.toFixed(digits)}%`;
}

export function formatRating(average: number | null, count: number) {
  if (count <= 0 || average == null || !Number.isFinite(average)) return "—";
  return average.toFixed(1);
}

export function formatDeltaPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Number(value.toFixed(1));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function formatChartDay(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function percentChange(current: number, previous: number | null | undefined) {
  if (previous == null) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function emptyDeltas(): AnalyticsDelta {
  return {
    pageViews: null,
    linkClicks: null,
    upvotes: null,
    ctr: null,
    likes: null,
    bookmarks: null,
    reviewCount: null,
    rating: null,
  };
}

export function buildMetricDeltas(
  current: AnalyticsTotals,
  previous: AnalyticsTotals | null,
): AnalyticsDelta {
  if (!previous) return emptyDeltas();

  const currentCtr =
    current.pageViews > 0 ? (current.linkClicks / current.pageViews) * 100 : null;
  const previousCtr =
    previous.pageViews > 0 ? (previous.linkClicks / previous.pageViews) * 100 : null;

  const ratingDelta =
    current.reviewAverage != null &&
    previous.reviewAverage != null &&
    current.reviewCount > 0 &&
    previous.reviewCount > 0
      ? percentChange(current.reviewAverage, previous.reviewAverage)
      : null;

  return {
    pageViews: percentChange(current.pageViews, previous.pageViews),
    linkClicks: percentChange(current.linkClicks, previous.linkClicks),
    upvotes: percentChange(current.upvotes, previous.upvotes),
    ctr:
      currentCtr == null || previousCtr == null
        ? null
        : percentChange(currentCtr, previousCtr),
    likes: percentChange(current.likes, previous.likes),
    bookmarks: percentChange(current.bookmarks, previous.bookmarks),
    reviewCount: percentChange(current.reviewCount, previous.reviewCount),
    rating: ratingDelta,
  };
}
