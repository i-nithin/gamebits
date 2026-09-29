export const ANALYTICS_PAGE_SUBTITLE =
  "See how people find your games and what they do next.";

export const DISCOVERY_METRICS = [
  {
    key: "pageViews",
    label: "Views",
    help: "People who opened your game page",
  },
  {
    key: "linkClicks",
    label: "Link clicks",
    help: "People who left to play or open a store/social link",
  },
  {
    key: "ctr",
    label: "Click rate",
    help: "Share of viewers who clicked a link",
  },
] as const;

export const ENGAGEMENT_METRICS = [
  {
    key: "upvotes",
    label: "Upvotes",
    help: "Votes your game got on the weekly board",
  },
  {
    key: "likes",
    label: "Likes",
    help: "People who liked your game",
  },
  {
    key: "bookmarks",
    label: "Bookmarks",
    help: "People who saved your game for later",
  },
  {
    key: "reviewCount",
    label: "Reviews",
    help: "How many written reviews you received",
  },
  {
    key: "rating",
    label: "Rating",
    help: "Average star score from those reviews",
  },
] as const;
