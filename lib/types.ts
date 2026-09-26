import type { GameLinkKind, GameStatus } from "@/lib/constants";

export type SearchGame = {
  slug: string;
  name: string;
  tagline: string;
  coverUrl: string;
  voteCount: number;
};

export type GamePlatformItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
};

export type RankedGame = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  coverUrl: string;
  logoUrl: string;
  trailerUrl: string | null;
  developerName: string;
  primaryUrl: string;
  status: GameStatus;
  tags: string[];
  platforms: GamePlatformItem[];
  outboundClicks: number;
  featured: boolean;
  voteCount: number;
  voted: boolean;
  rank: number;
};

export type WeekBoard = {
  year: number;
  week: number;
  live: boolean;
  games: RankedGame[];
};

export type GameMediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  sortOrder: number;
};

export type GameLinkItem = {
  kind: GameLinkKind;
  url: string;
};

export type GameLaunchItem = {
  year: number;
  week: number;
  live: boolean;
  featured: boolean;
  voteCount: number;
  rank: number;
};

export type GameReviewItem = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  imageUrl: string | null;
  createdAt: string;
  clerkUserId: string;
};

export type SavedGame = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
  status: GameStatus;
  tags: string[];
  platforms: GamePlatformItem[];
};

export type GamePageData = {
  game: RankedGame;
  media: GameMediaItem[];
  links: GameLinkItem[];
  launches: GameLaunchItem[];
  isOwner: boolean;
  isAdmin: boolean;
  archived: boolean;
  reviewAverage: number | null;
  reviewCount: number;
  reviews: GameReviewItem[];
  reviewsNextCursor: string | null;
  viewerReview: { rating: number; body: string } | null;
  bookmarked: boolean;
  liked: boolean;
  likeCount: number;
};
