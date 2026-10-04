export const PACIFIC_TIME_ZONE = "America/Los_Angeles";

export type PacificMonth = {
  year: number;
  month: number;
};

const pacificPartsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

const pacificInstantFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

const monthLabelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function pacificParts(date: Date) {
  const parts = Object.fromEntries(
    pacificPartsFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function currentPacificMonth(now = new Date()): PacificMonth {
  const parts = pacificParts(now);
  return { year: parts.year, month: parts.month };
}

export function addMonths(year: number, month: number, delta: number): PacificMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthKey(month: PacificMonth) {
  return `${month.year}-${String(month.month).padStart(2, "0")}`;
}

export function parseMonthKey(value: string): PacificMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function compareMonths(a: PacificMonth, b: PacificMonth) {
  return a.year - b.year || a.month - b.month;
}

export function monthWindow(count: number, now = new Date()): PacificMonth[] {
  const current = currentPacificMonth(now);
  return Array.from({ length: count }, (_, index) =>
    addMonths(current.year, current.month, index),
  );
}

export function formatMonthLabel(month: PacificMonth) {
  return monthLabelFormat.format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}

export function formatPacificInstant(date: Date) {
  return pacificInstantFormat.format(date);
}

export function pacificMonthStart(year: number, month: number) {
  let guess = new Date(Date.UTC(year, month - 1, 1, 8, 0, 0));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const parts = pacificParts(guess);
    const target = Date.UTC(year, month - 1, 1, 0, 0, 0);
    const actual = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const delta = target - actual;
    if (delta === 0) return guess;
    guess = new Date(guess.getTime() + delta);
  }
  return guess;
}

export function pacificMonthBounds(month: PacificMonth) {
  const start = pacificMonthStart(month.year, month.month);
  const next = addMonths(month.year, month.month, 1);
  const end = pacificMonthStart(next.year, next.month);
  return { start, end };
}

export function liveWindowLabel(month: PacificMonth) {
  const { start, end } = pacificMonthBounds(month);
  return `Live window: ${formatPacificInstant(start)} – ${formatPacificInstant(end)}`;
}

export type AdPhase = "pending" | "scheduled" | "live" | "ended" | "rejected" | "removed";

export function orderPhase(
  status: "pending" | "approved" | "rejected" | "removed",
  month: PacificMonth,
  activeSlots: number,
  now = new Date(),
): AdPhase {
  if (status === "rejected") return "rejected";
  if (status === "removed" || activeSlots <= 0) return "removed";
  if (status === "pending") return "pending";
  const { start, end } = pacificMonthBounds(month);
  if (now < start) return "scheduled";
  if (now >= end) return "ended";
  return "live";
}

export const AD_PHASE_LABELS: Record<AdPhase, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
  rejected: "Rejected",
  removed: "Removed",
};
