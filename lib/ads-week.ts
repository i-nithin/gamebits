import {
  addMonths,
  currentPacificMonth,
  formatMonthLabel,
  orderPhase,
  pacificCalendarDate,
  pacificMidnight,
  type AdPhase,
  type PacificMonth,
} from "@/lib/ads-month";

export type PacificDate = {
  year: number;
  month: number;
  day: number;
};

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const dayYearFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function utcDate(date: PacificDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function isRealDate(date: PacificDate) {
  const utc = utcDate(date);
  return (
    utc.getUTCFullYear() === date.year &&
    utc.getUTCMonth() === date.month - 1 &&
    utc.getUTCDate() === date.day
  );
}

export function addCivilDays(date: PacificDate, days: number): PacificDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function isMonday(date: PacificDate) {
  return utcDate(date).getUTCDay() === 1;
}

export function weekKey(date: PacificDate) {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

export function parseWeekKey(value: string): PacificDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (!isRealDate(date) || !isMonday(date)) return null;
  return date;
}

export function currentPacificWeekStart(now = new Date()): PacificDate {
  const today = pacificCalendarDate(now);
  const sinceMonday = (utcDate(today).getUTCDay() + 6) % 7;
  return addCivilDays(today, -sinceMonday);
}

export function nextMonthWeeks(now = new Date()): PacificDate[] {
  const current = currentPacificMonth(now);
  const next = addMonths(current.year, current.month, 1);
  const first = { year: next.year, month: next.month, day: 1 };
  const untilMonday = (8 - utcDate(first).getUTCDay()) % 7;
  const weeks: PacificDate[] = [];
  let cursor = addCivilDays(first, untilMonday);
  while (cursor.year === next.year && cursor.month === next.month) {
    weeks.push(cursor);
    cursor = addCivilDays(cursor, 7);
  }
  return weeks;
}

export function weekBounds(monday: PacificDate) {
  const start = pacificMidnight(monday.year, monday.month, monday.day);
  const next = addCivilDays(monday, 7);
  const end = pacificMidnight(next.year, next.month, next.day);
  return { start, end };
}

export function formatWeekRange(monday: PacificDate) {
  const end = addCivilDays(monday, 6);
  if (monday.year === end.year) {
    return `${dayFormat.format(utcDate(monday))} – ${dayFormat.format(utcDate(end))}, ${end.year}`;
  }
  return `${dayYearFormat.format(utcDate(monday))} – ${dayYearFormat.format(utcDate(end))}`;
}

export function nextMonthLabel(now = new Date()) {
  const current = currentPacificMonth(now);
  return formatMonthLabel(addMonths(current.year, current.month, 1));
}

export function formatScheduleLabel(input: {
  monthLabel: string;
  slotCount: number;
  weekStarts: readonly string[];
}) {
  if (input.weekStarts.length === 0) {
    const count = input.slotCount;
    return `${input.monthLabel} · ${count} ${count === 1 ? "slot" : "slots"}`;
  }
  const ranges = input.weekStarts.map((key) => {
    const date = parseWeekKey(key);
    return date ? formatWeekRange(date) : key;
  });
  const count = input.weekStarts.length;
  return `${ranges.join(", ")} · ${count} ${count === 1 ? "week" : "weeks"}`;
}

export function resolveOpenWeeks(keys: readonly string[], now = new Date()) {
  const openKeys = new Set(nextMonthWeeks(now).map(weekKey));
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    return { ok: false as const, error: "Choose at least one week" };
  }

  const selected: PacificDate[] = [];
  for (const key of unique) {
    const date = parseWeekKey(key);
    if (!date || !openKeys.has(key)) {
      return { ok: false as const, error: "That week is not open for booking" };
    }
    selected.push(date);
  }
  selected.sort((left, right) => weekKey(left).localeCompare(weekKey(right)));
  return {
    ok: true as const,
    year: selected[0].year,
    month: selected[0].month,
    weekStarts: selected.map(weekKey),
  };
}

export function bookingPhase(
  status: "pending" | "approved" | "rejected" | "removed",
  month: PacificMonth,
  activeSlots: number,
  weekStarts: readonly string[],
  now = new Date(),
): AdPhase {
  if (weekStarts.length === 0) return orderPhase(status, month, activeSlots, now);
  if (status === "rejected") return "rejected";
  if (status === "removed" || activeSlots <= 0) return "removed";
  if (status === "pending") return "pending";

  const ranges = weekStarts.flatMap((key) => {
    const date = parseWeekKey(key);
    return date ? [weekBounds(date)] : [];
  });
  if (ranges.length === 0) return orderPhase(status, month, activeSlots, now);
  if (ranges.some((range) => now >= range.start && now < range.end)) return "live";

  let earliest = ranges[0].start;
  let latest = ranges[0].end;
  for (const range of ranges) {
    if (range.start < earliest) earliest = range.start;
    if (range.end > latest) latest = range.end;
  }
  if (now < earliest) return "scheduled";
  if (now >= latest) return "ended";
  return "scheduled";
}

export function dateKey(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}
