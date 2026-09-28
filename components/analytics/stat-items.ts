import {
  formatAnalyticsCount,
  formatClickThrough,
  formatRating,
} from "@/lib/analytics/format";
import type { AnalyticsTotals } from "@/lib/analytics/types";

export type AnalyticsStat = {
  label: string;
  value: string;
};

export function analyticsPrimaryStats(totals: AnalyticsTotals, gameCount?: number): AnalyticsStat[] {
  const stats: AnalyticsStat[] = [
    { label: "Upvotes", value: formatAnalyticsCount(totals.upvotes) },
    { label: "Page views", value: formatAnalyticsCount(totals.pageViews) },
    { label: "Link clicks", value: formatAnalyticsCount(totals.linkClicks) },
  ];
  if (gameCount == null) return stats;
  return [{ label: "Games", value: formatAnalyticsCount(gameCount) }, ...stats];
}

export function analyticsSecondaryStats(totals: AnalyticsTotals): AnalyticsStat[] {
  return [
    {
      label: "Click-through",
      value: formatClickThrough(totals.linkClicks, totals.pageViews),
    },
    { label: "Likes", value: formatAnalyticsCount(totals.likes) },
    { label: "Bookmarks", value: formatAnalyticsCount(totals.bookmarks) },
    { label: "Reviews", value: formatAnalyticsCount(totals.reviewCount) },
    { label: "Rating", value: formatRating(totals.reviewAverage, totals.reviewCount) },
  ];
}
