const numberFormat = new Intl.NumberFormat("en-US");

export function formatAnalyticsCount(value: number) {
  return numberFormat.format(value);
}

export function formatClickThrough(clicks: number, views: number) {
  if (views <= 0) return "—";
  const percent = (clicks / views) * 100;
  const digits = percent >= 10 ? 0 : 1;
  return `${percent.toFixed(digits)}%`;
}

export function formatRating(average: number | null, count: number) {
  if (count <= 0 || average == null || !Number.isFinite(average)) return "—";
  return average.toFixed(1);
}
