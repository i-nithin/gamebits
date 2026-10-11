"use client";

import Image from "next/image";
import Link from "next/link";

import { AnalyticsSparkline } from "@/components/analytics/sparkline";
import { Badge } from "@/components/ui/badge";
import { formatAnalyticsCount, formatClickThrough } from "@/lib/analytics/format";
import type { AnalyticsGameRow } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const COLUMNS =
  "grid grid-cols-[minmax(15rem,1.5fr)_repeat(4,minmax(6.75rem,1fr))_6.5rem] items-center gap-x-6";

const HEAD =
  "text-[11px] tracking-[0.08em] text-fog uppercase";

export function AnalyticsGameList({
  games,
  query = "",
}: {
  games: AnalyticsGameRow[];
  query?: string;
}) {
  const sorted = games.toSorted(
    (a, b) => b.pageViews - a.pageViews || a.name.localeCompare(b.name),
  );
  const suffix = query.startsWith("?") || query === "" ? query : `?${query}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-obsidian card-ring">
      <div className="overflow-x-auto">
        <div className="min-w-[46rem] md:min-w-0">
          <div className={COLUMNS}>
            <span className={cn(HEAD, "sticky left-0 z-10 bg-obsidian py-3 pl-5 md:static")}>
              Game
            </span>
            <span className={cn(HEAD, "py-3 text-right")}>Views</span>
            <span className={cn(HEAD, "py-3 text-right")}>Unique</span>
            <span className={cn(HEAD, "py-3 text-right")}>Clicks</span>
            <span className={cn(HEAD, "py-3 text-right")}>Rate</span>
            <span className={cn(HEAD, "py-3 pr-5 text-right")}>Trend</span>
          </div>
          {sorted.map((game, index) => {
            const sparkValues = game.series.map((point) => point.pageViews);
            return (
              <Link
                key={game.id}
                href={`/analytics/${game.slug}${suffix}`}
                className={cn(
                  "group border-t border-white/8 transition-colors hover:bg-white/4",
                  COLUMNS,
                )}
              >
                <span className="sticky left-0 z-10 flex min-w-0 items-center gap-3 bg-obsidian py-3.5 pl-5 group-hover:bg-[#1c1c1e] md:static md:bg-transparent">
                  <span className="stat-mono w-4 shrink-0 text-xs text-fog">{index + 1}</span>
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                    <Image src={game.logoUrl} alt="" fill className="object-cover" sizes="44px" />
                  </span>
                  <span className="flex min-w-0 items-center gap-2 pr-3">
                    <span className="truncate text-sm font-medium text-paper-white">
                      {game.name}
                    </span>
                    {game.archived ? <Badge variant="outline">Archived</Badge> : null}
                  </span>
                </span>
                <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
                  {formatAnalyticsCount(game.pageViews)}
                </span>
                <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
                  {formatAnalyticsCount(game.uniqueViews)}
                </span>
                <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
                  {formatAnalyticsCount(game.linkClicks)}
                </span>
                <span className="stat-mono py-3.5 text-right text-sm text-paper-white">
                  {formatClickThrough(game.linkClicks, game.pageViews)}
                </span>
                <span className="flex justify-end py-3.5 pr-5">
                  <AnalyticsSparkline values={sparkValues} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
