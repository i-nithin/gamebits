export type IsoWeek = {
  year: number;
  week: number;
};

const MS_PER_DAY = 86_400_000;

export function getIsoWeekUtc(date = new Date()): IsoWeek {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  return { year, week };
}

function mondayUtc(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayNum - 1) + (week - 1) * 7);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function isoWeekRangeUtc(year: number, week: number) {
  const start = mondayUtc(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export function isIsoWeekLive(year: number, week: number, now = new Date()) {
  const current = getIsoWeekUtc(now);
  return current.year === year && current.week === week;
}

export function weekHref(year: number, week: number) {
  return `/week/${year}/${week}`;
}

export function formatIsoWeekLabel(year: number, week: number) {
  return `Week ${week}, ${year}`;
}

export function shiftIsoWeek(year: number, week: number, delta: number): IsoWeek {
  const { start } = isoWeekRangeUtc(year, week);
  const shifted = new Date(start);
  shifted.setUTCDate(shifted.getUTCDate() + delta * 7);
  return getIsoWeekUtc(shifted);
}

export function compareIsoWeek(a: IsoWeek, b: IsoWeek) {
  if (a.year !== b.year) return a.year - b.year;
  return a.week - b.week;
}

export function buildIsoWeekRange(center: IsoWeek, before: number, after: number): IsoWeek[] {
  const weeks: IsoWeek[] = [];
  for (let offset = -before; offset <= after; offset += 1) {
    weeks.push(shiftIsoWeek(center.year, center.week, offset));
  }
  return weeks;
}

export function parseWeekParams(year: string, week: string) {
  const isoYear = Number.parseInt(year, 10);
  const isoWeek = Number.parseInt(week, 10);
  if (!Number.isInteger(isoYear) || isoYear < 2000 || isoYear > 2100) {
    return null;
  }
  if (!Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    return null;
  }
  return { year: isoYear, week: isoWeek };
}
