"use client";

import Image from "next/image";
import Link from "next/link";

import { AnalyticsSparkline } from "@/components/analytics/sparkline";
import { Badge } from "@/components/ui/badge";
import {
  formatAnalyticsCount,
  formatClickThrough,
} from "@/lib/analytics/format";
import type { AnalyticsGameRow } from "@/lib/analytics/types";

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
    <div className="flex flex-col gap-1">
      <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem_4.5rem] items-center gap-3 px-2 sm:grid">
        <span className="text-[11px] tracking-[0.08em] text-fog uppercase">Game</span>
        <span className="justify-self-end text-[11px] tracking-[0.08em] text-fog uppercase">
          Views
        </span>
        <span className="justify-self-end text-[11px] tracking-[0.08em] text-fog uppercase">
          Link clicks
        </span>
        <span className="justify-self-end text-[11px] tracking-[0.08em] text-fog uppercase">
          Click rate
        </span>
        <span className="justify-self-end text-[11px] tracking-[0.08em] text-fog uppercase">
          Trend
        </span>
      </div>
      {sorted.map((game) => {
        const sparkValues = game.series.map((point) => point.pageViews);
        return (
          <Link
            key={game.id}
            href={`/analytics/${game.slug}${suffix}`}
            className="grid items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-graphite sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem_4.5rem]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite">
                <Image src={game.coverUrl} alt="" fill className="object-cover" sizes="48px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-paper-white">{game.name}</span>
                  {game.archived ? <Badge variant="outline">Archived</Badge> : null}
                </span>
                <span className="stat-mono mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fog sm:hidden">
                  <span>{formatAnalyticsCount(game.pageViews)} views</span>
                  <span>{formatAnalyticsCount(game.linkClicks)} link clicks</span>
                  <span>{formatClickThrough(game.linkClicks, game.pageViews)} click rate</span>
                </span>
              </span>
            </span>
            <span className="stat-mono hidden text-right text-sm text-paper-white sm:block">
              {formatAnalyticsCount(game.pageViews)}
            </span>
            <span className="stat-mono hidden text-right text-sm text-paper-white sm:block">
              {formatAnalyticsCount(game.linkClicks)}
            </span>
            <span className="stat-mono hidden text-right text-sm text-fog sm:block">
              {formatClickThrough(game.linkClicks, game.pageViews)}
            </span>
            <span className="hidden justify-self-end sm:block">
              <AnalyticsSparkline values={sparkValues} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
