export const WEEK_LISTING_CAP = 20;

export const GAME_STATUSES = [
  "released",
  "upcoming",
  "early_access",
  "demo",
  "playtest",
  "unreleased",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  released: "Released",
  upcoming: "Upcoming",
  early_access: "Early access",
  demo: "Demo",
  playtest: "Playtest",
  unreleased: "Unreleased",
};

export const PLATFORMS = ["PC", "Web", "iOS", "Android", "Console"] as const;
