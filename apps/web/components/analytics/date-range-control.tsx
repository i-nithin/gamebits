"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatDayLabel, todayUtcDay } from "@/lib/analytics/range";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const PORTFOLIO_PRESETS: Array<{
  key: Exclude<AnalyticsRangeKey, "launch" | "custom">;
  label: string;
}> = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

const GAME_PRESETS: Array<{ key: Exclude<AnalyticsRangeKey, "custom">; label: string }> = [
  { key: "launch", label: "Launch week" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

function shortRangeLabel(start: string | null, end: string | null) {
  if (!start || !end) return "Custom";
  if (start === end) return formatDayLabel(start).replace(/, \d{4}$/, "");
  const from = formatDayLabel(start).replace(/, \d{4}$/, "");
  const to = formatDayLabel(end).replace(/, \d{4}$/, "");
  return `${from} – ${to}`;
}

export function AnalyticsDateRangeControl({
  value,
  start,
  end,
  includeLaunch = false,
}: {
  value: AnalyticsRangeKey;
  start: string | null;
  end: string | null;
  periodLabel: string;
  includeLaunch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const presets = includeLaunch ? GAME_PRESETS : PORTFOLIO_PRESETS;
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => start ?? "");
  const [to, setTo] = useState(() => end ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const maxDay = todayUtcDay();
  const customLabel = shortRangeLabel(start, end);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pushParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function selectPreset(key: Exclude<AnalyticsRangeKey, "custom">) {
    setOpen(false);
    pushParams((next) => {
      next.delete("from");
      next.delete("to");
      if (includeLaunch) {
        if (key === "launch") next.delete("range");
        else next.set("range", key);
      } else if (key === "7d") {
        next.delete("range");
      } else {
        next.set("range", key);
      }
    });
  }

  function openCustom() {
    setFrom(start ?? todayUtcDay());
    setTo(end ?? todayUtcDay());
    setOpen((current) => !current);
  }

  function applyCustom() {
    if (!from || !to) return;
    pushParams((next) => {
      next.delete("range");
      next.set("from", from);
      next.set("to", to);
    });
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-graphite/80 p-1 card-ring">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={value === preset.key}
            onClick={() => selectPreset(preset.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors",
              value === preset.key
                ? "bg-obsidian text-ice-signal"
                : "text-fog hover:text-paper-white",
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value === "custom" || open}
          aria-expanded={open}
          onClick={openCustom}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs transition-colors",
            value === "custom" || open
              ? "bg-obsidian text-ice-signal"
              : "text-fog hover:text-paper-white",
          )}
        >
          {value === "custom" ? customLabel : "Custom"}
        </button>
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(100vw-2rem,22rem)] rounded-2xl bg-obsidian p-4 shadow-xl card-ring">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-fog">Pick a date range (up to today)</p>
            <label className="flex flex-col gap-1.5 text-xs text-fog">
              From
              <input
                type="date"
                value={from}
                max={maxDay}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-xl border border-iron bg-charcoal px-3 py-2 text-sm text-paper-white outline-none focus:border-ice-signal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-fog">
              To
              <input
                type="date"
                value={to}
                max={maxDay}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-xl border border-iron bg-charcoal px-3 py-2 text-sm text-paper-white outline-none focus:border-ice-signal"
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!from || !to}
                onClick={applyCustom}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
