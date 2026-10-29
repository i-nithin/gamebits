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

import { InfoTip } from "@/components/game/field-info";
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
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {ENGAGEMENT_METRICS.map((metric) => {
        const Icon = ICONS[metric.key] ?? HeartIcon;
        const delta = deltaFor(metric.key, deltas);
        const deltaLabel = formatDeltaPercent(delta);
        const positive = delta != null && delta > 0;
        const negative = delta != null && delta < 0;
        return (
          <div key={metric.key} className="flex flex-col gap-3 rounded-sm bg-obsidian px-4 py-5 card-ring">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl text-ice-signal">
                <Icon className="size-4" aria-hidden />
              </span>
              {deltaLabel ? (
                <span
                  className={cn(
                    "stat-mono inline-flex items-center gap-1 text-xs",
                    negative ? "text-error" : "text-trend",
                  )}
                >
                  {positive ? <TrendingUpIcon className="size-3.5" /> : null}
                  {negative ? <TrendingDownIcon className="size-3.5" /> : null}
                  {deltaLabel}
                </span>
              ) : null}
            </div>
            <div>
              <p className="stat-mono text-2xl text-paper-white">{valueFor(metric.key, totals)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] tracking-[0.08em] text-fog uppercase">
                {metric.label}
                <InfoTip text={metric.help} />
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
