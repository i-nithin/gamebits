export type AnalyticsTotals = {
  upvotes: number;
  pageViews: number;
  linkClicks: number;
  likes: number;
  bookmarks: number;
  reviewCount: number;
  reviewAverage: number | null;
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
};

export type AnalyticsPortfolio = {
  gameCount: number;
  totals: AnalyticsTotals;
  games: AnalyticsGameRow[];
};

export type AnalyticsLaunch = {
  year: number;
  week: number;
  live: boolean;
  rank: number;
  voteCount: number;
};

export type AnalyticsClickRow = {
  label: string;
  count: number;
};

export type GameAnalytics = {
  slug: string;
  name: string;
  coverUrl: string;
  archived: boolean;
  totals: AnalyticsTotals;
  launches: AnalyticsLaunch[];
  clicks: AnalyticsClickRow[];
};
