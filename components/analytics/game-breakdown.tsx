import Link from "next/link";

import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsClickRow, AnalyticsLaunch } from "@/lib/analytics/types";
import { formatIsoWeekLabel, weekHref } from "@/lib/iso-week";
import { cn } from "@/lib/utils";

export function AnalyticsLaunches({ launches }: { launches: AnalyticsLaunch[] }) {
  if (launches.length === 0) {
    return <p className="px-1 text-sm text-fog">This game has not been on a weekly board yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {launches.map((launch) => (
        <Link
          key={`${launch.year}-${launch.week}`}
          href={weekHref(launch.year, launch.week)}
          className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-graphite"
        >
          <span
            className={cn(
              "stat-mono w-14 shrink-0 text-2xl",
              launch.live ? "text-ice-signal" : "text-paper-white",
            )}
          >
            {launch.rank > 0 ? `#${launch.rank}` : "—"}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm",
                launch.live ? "text-ice-signal" : "text-paper-white",
              )}
            >
              {formatIsoWeekLabel(launch.year, launch.week)}
            </span>
            <span className="stat-mono text-xs text-fog">
              {formatAnalyticsCount(launch.voteCount)} votes
            </span>
          </span>
          {launch.live ? (
            <span className="text-[11px] tracking-[0.08em] text-ice-signal uppercase">Live</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsClicks({ clicks }: { clicks: AnalyticsClickRow[] }) {
  if (clicks.length === 0) {
    return <p className="px-1 text-sm text-fog">No link clicks yet.</p>;
  }

  const max = clicks.reduce((peak, click) => Math.max(peak, click.count), 0);

  return (
    <div className="flex flex-col gap-4 px-1">
      {clicks.map((click) => {
        const width = click.count > 0 && max > 0 ? (click.count / max) * 100 : 0;
        return (
          <div key={click.label} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-paper-white">{click.label}</span>
              <span className="stat-mono text-sm text-paper-white">
                {formatAnalyticsCount(click.count)}
              </span>
            </div>
            <span className="block h-0.5 overflow-hidden rounded-full bg-graphite">
              <span
                className="block h-full rounded-full bg-ice-strong"
                style={{ width: `${width}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
