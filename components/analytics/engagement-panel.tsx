import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRightIcon,
  BookmarkIcon,
  HeartIcon,
  MessageSquareIcon,
  StarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";

import {
  formatAnalyticsCount,
  formatDeltaPercent,
  formatRating,
} from "@/lib/analytics/format";
import { ENGAGEMENT_METRICS } from "@/lib/analytics/metric-copy";
import type { AnalyticsDelta, AnalyticsTotals } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  upvotes: ArrowUpRightIcon,
  likes: HeartIcon,
  bookmarks: BookmarkIcon,
  reviewCount: MessageSquareIcon,
  rating: StarIcon,
};

function valueFor(key: string, totals: AnalyticsTotals) {
  switch (key) {
    case "upvotes":
      return formatAnalyticsCount(totals.upvotes);
    case "likes":
      return formatAnalyticsCount(totals.likes);
    case "bookmarks":
      return formatAnalyticsCount(totals.bookmarks);
    case "reviewCount":
      return formatAnalyticsCount(totals.reviewCount);
    case "rating":
      return formatRating(totals.reviewAverage, totals.reviewCount);
    default:
      return "—";
  }
}

function deltaFor(key: string, deltas: AnalyticsDelta) {
  switch (key) {
    case "upvotes":
      return deltas.upvotes;
    case "likes":
      return deltas.likes;
    case "bookmarks":
      return deltas.bookmarks;
    case "reviewCount":
      return deltas.reviewCount;
    case "rating":
      return deltas.rating;
    default:
      return null;
  }
}

export function AnalyticsEngagementPanel({
  totals,
  deltas,
}: {
  totals: AnalyticsTotals;
  deltas: AnalyticsDelta;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-obsidian p-5 card-ring">
      <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Engagement</h2>
      <div className="flex flex-col">
        {ENGAGEMENT_METRICS.map((metric) => {
          const Icon = ICONS[metric.key] ?? HeartIcon;
          const delta = deltaFor(metric.key, deltas);
          const deltaLabel = formatDeltaPercent(delta);
          const positive = delta != null && delta > 0;
          const negative = delta != null && delta < 0;
          return (
            <div
              key={metric.key}
              className="flex items-start gap-3 border-b border-white/6 py-3 last:border-b-0 last:pb-0 first:pt-0"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-fog" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-paper-white">{metric.label}</span>
                  <span className="stat-mono text-sm text-paper-white">
                    {valueFor(metric.key, totals)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-fog">{metric.help}</p>
                  {deltaLabel ? (
                    <span
                      className={cn(
                        "stat-mono inline-flex shrink-0 items-center gap-1 text-xs",
                        positive && "text-success",
                        negative && "text-error",
                        !positive && !negative && "text-fog",
                      )}
                    >
                      {positive ? <TrendingUpIcon className="size-3.5" /> : null}
                      {negative ? <TrendingDownIcon className="size-3.5" /> : null}
                      {deltaLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
