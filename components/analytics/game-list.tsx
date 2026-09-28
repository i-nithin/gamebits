"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsGameRow } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type SortKey = "upvotes" | "pageViews" | "linkClicks";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "upvotes", label: "Upvotes" },
  { key: "pageViews", label: "Views" },
  { key: "linkClicks", label: "Clicks" },
];

function shareWidth(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  return (value / max) * 100;
}

export function AnalyticsGameList({ games }: { games: AnalyticsGameRow[] }) {
  const [sort, setSort] = useState<SortKey>("upvotes");
  const sorted = games.toSorted(
    (a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name),
  );
  const max = sorted.reduce((peak, game) => Math.max(peak, game[sort]), 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 px-2 sm:hidden">
        {SORTS.map((item) => (
          <SortButton
            key={item.key}
            label={item.label}
            active={sort === item.key}
            onSelect={() => setSort(item.key)}
          />
        ))}
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center gap-3 px-2 sm:grid">
        <span className="text-[11px] tracking-[0.08em] text-fog uppercase">Game</span>
        {SORTS.map((item) => (
          <SortButton
            key={item.key}
            label={item.label}
            active={sort === item.key}
            align="end"
            onSelect={() => setSort(item.key)}
          />
        ))}
      </div>
      {sorted.map((game) => (
        <Link
          key={game.id}
          href={`/analytics/${game.slug}`}
          className="grid items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-graphite sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem]"
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
              <ShareBar value={shareWidth(game[sort], max)} />
              <span className="stat-mono mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs sm:hidden">
                <span className={sort === "upvotes" ? "text-ice-signal" : "text-fog"}>
                  {formatAnalyticsCount(game.upvotes)} upvotes
                </span>
                <span className={sort === "pageViews" ? "text-ice-signal" : "text-fog"}>
                  {formatAnalyticsCount(game.pageViews)} views
                </span>
                <span className={sort === "linkClicks" ? "text-ice-signal" : "text-fog"}>
                  {formatAnalyticsCount(game.linkClicks)} clicks
                </span>
              </span>
            </span>
          </span>
          <MetricCell value={game.upvotes} active={sort === "upvotes"} />
          <MetricCell value={game.pageViews} active={sort === "pageViews"} />
          <MetricCell value={game.linkClicks} active={sort === "linkClicks"} />
        </Link>
      ))}
    </div>
  );
}

function SortButton({
  label,
  active,
  align = "start",
  onSelect,
}: {
  label: string;
  active: boolean;
  align?: "start" | "end";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "rounded-md px-1 py-1 text-[11px] tracking-[0.08em] whitespace-nowrap uppercase",
        align === "end" && "justify-self-end text-right",
        active ? "text-ice-signal" : "text-fog hover:text-paper-white",
      )}
    >
      {label}
    </button>
  );
}

function ShareBar({ value }: { value: number }) {
  return (
    <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-graphite">
      <span
        className="block h-full rounded-full bg-ice-strong"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

function MetricCell({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        "stat-mono hidden text-right text-sm sm:block",
        active ? "text-ice-signal" : "text-paper-white",
      )}
    >
      {formatAnalyticsCount(value)}
    </span>
  );
}
