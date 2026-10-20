import { getIsoWeekUtc, isoWeekRangeUtc, shiftIsoWeek, type IsoWeek } from "@/lib/iso-week";

const DAY_MS = 86_400_000;

export const TREND_RANGES = ["today", "1d", "week", "month"] as const;
export type TrendRange = (typeof TREND_RANGES)[number];
export type TrendPeriodKind = "day" | "week" | "month";

export type TrendPeriodWindow = {
  kind: TrendPeriodKind;
  key: string;
  hotStart: Date;
  hotEnd: Date;
  baseStart: Date;
  halfLifeHours: number;
  sealed: boolean;
};

const RANGE_LABELS: Record<TrendRange, string> = {
  today: "Today",
  "1d": "1d",
  week: "Week",
  month: "Month",
};

export function trendRangeLabel(range: TrendRange) {
  return RANGE_LABELS[range];
}

export function isTrendRange(value: string | undefined): value is TrendRange {
  return value === "today" || value === "1d" || value === "week" || value === "month";
}

export function trendPeriods(now: Date): TrendPeriodWindow[] {
  const todayStart = utcDayStart(now);
  const yesterdayStart = addUtcDays(todayStart, -1);
  const current = getIsoWeekUtc(now);
  const previous = shiftIsoWeek(current.year, current.week, -1);
  const beforePrevious = shiftIsoWeek(current.year, current.week, -2);
  const weekStart = isoWeekRangeUtc(current.year, current.week).start;
  const previousWeekStart = isoWeekRangeUtc(previous.year, previous.week).start;
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const beforePreviousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));

  return [
    {
      kind: "day",
      key: dayKey(todayStart),
      hotStart: todayStart,
      hotEnd: now,
      baseStart: yesterdayStart,
      halfLifeHours: 8,
      sealed: false,
    },
    {
      kind: "day",
      key: dayKey(yesterdayStart),
      hotStart: yesterdayStart,
      hotEnd: closedEnd(todayStart),
      baseStart: addUtcDays(todayStart, -2),
      halfLifeHours: 8,
      sealed: true,
    },
    {
      kind: "week",
      key: weekKey(current),
      hotStart: weekStart,
      hotEnd: now,
      baseStart: previousWeekStart,
      halfLifeHours: 48,
      sealed: false,
    },
    {
      kind: "week",
      key: weekKey(previous),
      hotStart: previousWeekStart,
      hotEnd: closedEnd(weekStart),
      baseStart: isoWeekRangeUtc(beforePrevious.year, beforePrevious.week).start,
      halfLifeHours: 48,
      sealed: true,
    },
    {
      kind: "month",
      key: monthKey(monthStart),
      hotStart: monthStart,
      hotEnd: now,
      baseStart: previousMonthStart,
      halfLifeHours: 24 * 7,
      sealed: false,
    },
    {
      kind: "month",
      key: monthKey(previousMonthStart),
      hotStart: previousMonthStart,
      hotEnd: closedEnd(monthStart),
      baseStart: beforePreviousMonthStart,
      halfLifeHours: 24 * 7,
      sealed: true,
    },
  ];
}

export function trendRangePeriod(range: TrendRange, now = new Date()): TrendPeriodWindow {
  const periods = trendPeriods(now);
  if (range === "today") return openPeriod(periods, "day");
  if (range === "1d") return sealedPeriod(periods, "day");
  if (range === "week") return openPeriod(periods, "week");
  return openPeriod(periods, "month");
}

function openPeriod(periods: TrendPeriodWindow[], kind: TrendPeriodKind) {
  const period = periods.find((item) => item.kind === kind && !item.sealed);
  if (!period) throw new Error(`Missing open ${kind} trend period`);
  return period;
}

function sealedPeriod(periods: TrendPeriodWindow[], kind: TrendPeriodKind) {
  const period = periods.find((item) => item.kind === kind && item.sealed);
  if (!period) throw new Error(`Missing sealed ${kind} trend period`);
  return period;
}

function utcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function closedEnd(nextStart: Date) {
  return new Date(nextStart.getTime() - 1);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(week: IsoWeek) {
  return `${week.year}-W${String(week.week).padStart(2, "0")}`;
}

function monthKey(start: Date) {
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
}
