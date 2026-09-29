import { isoWeekRangeUtc } from "@gamebits/db/iso-week";
import type { AnalyticsRangeKey, AnalyticsSearchParams } from "./types";

export type AnalyticsWindow = {
  key: AnalyticsRangeKey;
  start: string | null;
  end: string | null;
  previousStart: string | null;
  previousEnd: string | null;
};

const MS_PER_DAY = 86_400_000;
const MAX_SPAN_DAYS = 365;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(day: string, delta: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return toUtcDay(date);
}

function daysBetween(start: string, end: string) {
  const a = new Date(`${start}T00:00:00.000Z`).getTime();
  const b = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

function isValidDay(value: string | null | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toUtcDay(date) === value;
}

function withPrevious(key: AnalyticsRangeKey, start: string, end: string): AnalyticsWindow {
  const length = daysBetween(start, end);
  const previousEnd = addUtcDays(start, -1);
  const previousStart = addUtcDays(previousEnd, -(length - 1));
  return { key, start, end, previousStart, previousEnd };
}

export function parseAnalyticsRange(value: string | null | undefined): AnalyticsRangeKey {
  if (value === "30d" || value === "all" || value === "launch" || value === "7d" || value === "custom") {
    return value;
  }
  return "7d";
}

export function buildRollingWindow(key: "7d" | "30d", now = new Date()): AnalyticsWindow {
  const days = key === "7d" ? 7 : 30;
  const end = toUtcDay(now);
  const start = addUtcDays(end, -(days - 1));
  return withPrevious(key, start, end);
}

export function buildLaunchWindow(
  year: number,
  week: number,
  now = new Date(),
): AnalyticsWindow {
  const { start, end } = isoWeekRangeUtc(year, week);
  const startDay = toUtcDay(start);
  const endDay = toUtcDay(end > now ? now : end);
  return withPrevious("launch", startDay, endDay);
}

export function buildAllWindow(): AnalyticsWindow {
  return {
    key: "all",
    start: null,
    end: null,
    previousStart: null,
    previousEnd: null,
  };
}

export function buildCustomWindow(
  fromInput: string | null | undefined,
  toInput: string | null | undefined,
  now = new Date(),
): AnalyticsWindow | null {
  if (!isValidDay(fromInput) || !isValidDay(toInput)) return null;

  const today = toUtcDay(now);
  let start = fromInput > today ? today : fromInput;
  let end = toInput > today ? today : toInput;

  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }

  if (daysBetween(start, end) > MAX_SPAN_DAYS) {
    start = addUtcDays(end, -(MAX_SPAN_DAYS - 1));
  }

  return withPrevious("custom", start, end);
}

export function resolveAnalyticsWindow(opts: {
  params: AnalyticsSearchParams;
  defaultKey?: AnalyticsRangeKey;
  launch?: { year: number; week: number } | null;
  now?: Date;
}): AnalyticsWindow {
  const now = opts.now ?? new Date();
  const custom = buildCustomWindow(opts.params.from, opts.params.to, now);
  if (custom) return custom;

  const requested = parseAnalyticsRange(opts.params.range);
  const defaultKey = opts.defaultKey ?? "7d";
  const key =
    opts.params.range == null || opts.params.range === ""
      ? defaultKey
      : requested === "launch" && !opts.launch
        ? "7d"
        : requested;

  if (key === "all") return buildAllWindow();
  if (key === "launch" && opts.launch) {
    return buildLaunchWindow(opts.launch.year, opts.launch.week, now);
  }
  if (key === "30d") return buildRollingWindow("30d", now);
  return buildRollingWindow("7d", now);
}

export function fillSeriesDays(
  start: string,
  end: string,
  rows: Array<{ day: string; pageViews: number; linkClicks: number }>,
) {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const series: Array<{ day: string; pageViews: number; linkClicks: number }> = [];
  let cursor = start;
  while (cursor <= end) {
    const hit = byDay.get(cursor);
    series.push({
      day: cursor,
      pageViews: hit?.pageViews ?? 0,
      linkClicks: hit?.linkClicks ?? 0,
    });
    cursor = addUtcDays(cursor, 1);
  }
  return series;
}

export function clickThroughRate(clicks: number, views: number) {
  if (views <= 0) return null;
  return (clicks / views) * 100;
}

export function formatPeriodLabel(window: AnalyticsWindow) {
  if (window.key === "all" || !window.start || !window.end) return "All time";
  if (window.key === "launch") return `Launch week · ${formatDayLabel(window.start)} – ${formatDayLabel(window.end)}`;
  if (window.start === window.end) return formatDayLabel(window.start);
  return `${formatDayLabel(window.start)} – ${formatDayLabel(window.end)}`;
}

export function formatDayLabel(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function analyticsQueryString(
  window: Pick<AnalyticsWindow, "key" | "start" | "end">,
) {
  const params = new URLSearchParams();
  if (window.key === "custom" && window.start && window.end) {
    params.set("from", window.start);
    params.set("to", window.end);
  } else if (window.key === "30d" || window.key === "all" || window.key === "launch") {
    params.set("range", window.key);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function analyticsQueryHref(
  base: string,
  window: Pick<AnalyticsWindow, "key" | "start" | "end">,
) {
  return `${base}${analyticsQueryString(window)}`;
}

export function todayUtcDay(now = new Date()) {
  return toUtcDay(now);
}
