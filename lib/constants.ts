export const WEEK_LISTING_CAP = 20;
export const GAME_MEDIA_CAP = 8;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const REVIEW_PAGE_SIZE = 10;
export const REVIEW_BODY_MAX = 1000;

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

export const GAME_LINK_KINDS = [
  "web",
  "steam",
  "playstore",
  "appstore",
  "nintendo",
  "playstation",
  "xbox",
  "discord",
  "x",
] as const;

export type GameLinkKind = (typeof GAME_LINK_KINDS)[number];

export const GAME_LINK_FIELDS: Array<{
  kind: GameLinkKind;
  label: string;
  placeholder: string;
}> = [
  { kind: "web", label: "Website", placeholder: "https://yourgame.com" },
  { kind: "steam", label: "Steam", placeholder: "https://store.steampowered.com/app/..." },
  { kind: "playstore", label: "Play Store", placeholder: "https://play.google.com/store/apps/..." },
  { kind: "appstore", label: "App Store", placeholder: "https://apps.apple.com/..." },
  { kind: "nintendo", label: "Nintendo", placeholder: "https://www.nintendo.com/..." },
  { kind: "playstation", label: "PlayStation", placeholder: "https://store.playstation.com/..." },
  { kind: "xbox", label: "Xbox", placeholder: "https://www.xbox.com/..." },
  { kind: "discord", label: "Discord", placeholder: "https://discord.gg/invite" },
  { kind: "x", label: "X (Twitter)", placeholder: "https://x.com/game" },
];

export const PRIMARY_LINK_ORDER: GameLinkKind[] = [
  "web",
  "steam",
  "playstore",
  "appstore",
  "nintendo",
  "playstation",
  "xbox",
];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
