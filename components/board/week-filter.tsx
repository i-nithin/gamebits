"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import type { IsoWeek } from "@/lib/iso-week";
import { compareIsoWeek } from "@/lib/iso-week";
import { cn } from "@/lib/utils";

const VISIBLE_WEEKS = 7;

export function WeekFilter({
  weeks,
  selected,
  current,
  windowStart,
  onSelect,
  onWindowStartChange,
}: {
  weeks: IsoWeek[];
  selected: IsoWeek;
  current: IsoWeek;
  windowStart: number;
  onSelect: (week: IsoWeek) => void;
  onWindowStartChange: (start: number) => void;
}) {
  const visible = weeks.slice(windowStart, windowStart + VISIBLE_WEEKS);
  const canScrollLeft = windowStart > 0;
  const canScrollRight = windowStart + VISIBLE_WEEKS < weeks.length;

  return (
    <div className="flex items-center gap-1 rounded-full bg-graphite p-1">
      <button
        type="button"
        aria-label="Show earlier weeks"
        disabled={!canScrollLeft}
        onClick={() => onWindowStartChange(windowStart - 1)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-fog transition-colors hover:bg-slate/70 hover:text-paper-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((week) => {
          const isSelected = week.year === selected.year && week.week === selected.week;
          const isFuture = compareIsoWeek(week, current) > 0;

          return (
            <button
              key={`${week.year}-${week.week}`}
              type="button"
              disabled={isFuture}
              onClick={() => {
                if (!isFuture) onSelect(week);
              }}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                isSelected
                  ? "bg-void text-paper-white"
                  : isFuture
                    ? "cursor-default text-fog/40"
                    : "text-fog hover:bg-slate/50 hover:text-paper-white",
              )}
            >
              <span className="sm:hidden">W{week.week}</span>
              <span className="hidden sm:inline">Week {week.week}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Show later weeks"
        disabled={!canScrollRight}
        onClick={() => onWindowStartChange(windowStart + 1)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-fog transition-colors hover:bg-slate/70 hover:text-paper-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRightIcon className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
