import Link from "next/link";

import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsLaunch } from "@/lib/analytics/types";
import { formatIsoWeekLabel, hasIsoWeekStarted, weekHref } from "@/lib/iso-week";
import { cn } from "@/lib/utils";

const COLUMNS =
  "grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-3 sm:gap-x-8 [&>*:not(:first-child)]:min-w-0";

const HEAD = "text-[11px] tracking-[0.08em] text-fog uppercase";

export function AnalyticsLaunches({ launches }: { launches: AnalyticsLaunch[] }) {
  if (launches.length === 0) {
    return (
      <div className="rounded-2xl bg-obsidian p-5 card-ring">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Launch history</h2>
        <p className="mt-4 text-sm text-fog">This game has not been on a weekly board yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-obsidian card-ring">
      <h2 className="px-4 pt-5 pb-1 text-[11px] tracking-[0.08em] text-fog uppercase sm:px-5">
        Launch history
      </h2>
      <div className={COLUMNS}>
        <span className={cn(HEAD, "py-3 pl-4 sm:pl-5")}>Week</span>
        <span className={cn(HEAD, "py-3 text-right")}>Rank</span>
        <span className={cn(HEAD, "py-3 text-right")}>Votes</span>
        <span className={cn(HEAD, "py-3 pr-4 text-right sm:pr-5")}>Status</span>
      </div>
      {launches.map((launch) => (
        <Link
          key={`${launch.year}-${launch.week}`}
          href={weekHref(launch.year, launch.week)}
          className={cn(
            "group border-t border-white/8 transition-colors hover:bg-white/4",
            COLUMNS,
          )}
        >
          <span className="py-3.5 pl-4 text-sm whitespace-nowrap text-paper-white group-hover:text-ice-signal sm:pl-5">
            {formatIsoWeekLabel(launch.year, launch.week)}
          </span>
          <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
            {launch.rank > 0 ? `#${launch.rank}` : "—"}
          </span>
          <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
            {formatAnalyticsCount(launch.voteCount)}
          </span>
          <span className="py-3.5 pr-4 text-right text-xs sm:pr-5">
            {launch.live ? (
              <span className="text-ice-signal">Live</span>
            ) : hasIsoWeekStarted(launch.year, launch.week) ? (
              <span className="text-fog">Rank locked</span>
            ) : (
              <span className="text-fog">Upcoming</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
