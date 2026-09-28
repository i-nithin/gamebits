export type AnalyticsRangeKey = "7d" | "30d" | "all" | "launch" | "custom";

export type AnalyticsTotals = {
  upvotes: number;
  pageViews: number;
  linkClicks: number;
  likes: number;
  bookmarks: number;
  reviewCount: number;
  reviewAverage: number | null;
};

export type AnalyticsDelta = {
  pageViews: number | null;
  linkClicks: number | null;
  upvotes: number | null;
  ctr: number | null;
  likes: number | null;
  bookmarks: number | null;
  reviewCount: number | null;
  rating: number | null;
};

export type AnalyticsSeriesPoint = {
  day: string;
  pageViews: number;
  linkClicks: number;
};

export type AnalyticsGameRow = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string;
  archived: boolean;
  upvotes: number;
  pageViews: number;
  linkClicks: number;
  series: AnalyticsSeriesPoint[];
};

export type AnalyticsClickRow = {
  kind: string;
  label: string;
  count: number;
};

export type AnalyticsCountryRow = {
  code: string;
  pageViews: number;
  linkClicks: number;
};

export type AnalyticsPortfolio = {
  gameCount: number;
  range: AnalyticsRangeKey;
  start: string | null;
  end: string | null;
  periodLabel: string;
  totals: AnalyticsTotals;
  previous: AnalyticsTotals | null;
  deltas: AnalyticsDelta;
  series: AnalyticsSeriesPoint[];
  countries: AnalyticsCountryRow[];
  games: AnalyticsGameRow[];
};

export type AnalyticsLaunch = {
  year: number;
  week: number;
  live: boolean;
  rank: number;
  voteCount: number;
};

export type GameAnalytics = {
  slug: string;
  name: string;
  coverUrl: string;
  archived: boolean;
  range: AnalyticsRangeKey;
  start: string | null;
  end: string | null;
  periodLabel: string;
  hasLaunchRange: boolean;
  totals: AnalyticsTotals;
  previous: AnalyticsTotals | null;
  deltas: AnalyticsDelta;
  series: AnalyticsSeriesPoint[];
  countries: AnalyticsCountryRow[];
  launches: AnalyticsLaunch[];
  clicks: AnalyticsClickRow[];
};

export type AnalyticsSearchParams = {
  range?: string | null;
  from?: string | null;
  to?: string | null;
};
