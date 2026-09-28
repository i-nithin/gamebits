import Link from "next/link";

import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsLaunch } from "@/lib/analytics/types";
import { formatIsoWeekLabel, weekHref } from "@/lib/iso-week";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-3 rounded-2xl bg-obsidian p-5 card-ring">
      <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Launch history</h2>
      <div className="flex flex-col">
        {launches.map((launch) => (
          <Link
            key={`${launch.year}-${launch.week}`}
            href={weekHref(launch.year, launch.week)}
            className="flex items-center gap-4 rounded-xl px-1 py-3 transition-colors hover:bg-graphite"
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
    </div>
  );
}
