import type { LucideIcon } from "lucide-react";
import {
  EyeIcon,
  MousePointerClickIcon,
  PercentIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";

import {
  formatAnalyticsCount,
  formatClickThrough,
  formatDeltaPercent,
} from "@/lib/analytics/format";
import { DISCOVERY_METRICS } from "@/lib/analytics/metric-copy";
import type { AnalyticsDelta, AnalyticsTotals } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  pageViews: EyeIcon,
  linkClicks: MousePointerClickIcon,
  ctr: PercentIcon,
};

function valueFor(key: string, totals: AnalyticsTotals) {
  if (key === "pageViews") return formatAnalyticsCount(totals.pageViews);
  if (key === "linkClicks") return formatAnalyticsCount(totals.linkClicks);
  return formatClickThrough(totals.linkClicks, totals.pageViews);
}

function deltaFor(key: string, deltas: AnalyticsDelta) {
  if (key === "pageViews") return deltas.pageViews;
  if (key === "linkClicks") return deltas.linkClicks;
  return deltas.ctr;
}

export function AnalyticsDiscoveryStrip({
  totals,
  deltas,
}: {
  totals: AnalyticsTotals;
  deltas: AnalyticsDelta;
}) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-white/8 card-ring sm:grid-cols-3">
      {DISCOVERY_METRICS.map((metric) => {
        const Icon = ICONS[metric.key] ?? EyeIcon;
        const delta = deltaFor(metric.key, deltas);
        const deltaLabel = formatDeltaPercent(delta);
        const positive = delta != null && delta > 0;
        const negative = delta != null && delta < 0;
        return (
          <div key={metric.key} className="flex flex-col gap-2 bg-obsidian px-5 py-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tracking-[0.08em] text-fog uppercase">
                {metric.label}
              </span>
              <Icon className="size-4 text-fog" aria-hidden />
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="stat-mono text-3xl text-paper-white">
                {valueFor(metric.key, totals)}
              </span>
              {deltaLabel ? (
                <span
                  className={cn(
                    "stat-mono inline-flex items-center gap-1 text-xs",
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
            <p className="text-xs leading-5 text-fog">{metric.help}</p>
          </div>
        );
      })}
    </div>
  );
}
