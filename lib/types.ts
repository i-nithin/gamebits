import type { GameLinkKind, GameStatus, IarcRating } from "@/lib/constants";

export type SearchScope = "all" | "games" | "people";

export type SearchGameHit = {
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
};

export type SearchPersonHit = {
  handle: string;
  name: string;
  imageUrl: string | null;
  headline: string | null;
};

export type GamePlatformItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
};

export type GameCategoryItem = {
  id: string;
  slug: string;
  name: string;
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
  categories: GameCategoryItem[];
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
  votingOpen: boolean;
  games: RankedGame[];
  /** Ended week whose listings all have a stored final rank. */
  ranksFrozen: boolean;
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
  handle: string | null;
};

export type Viewer = {
  name: string;
  handle: string;
  imageUrl: string | null;
  deletionDeadline: string | null;
  banned: boolean;
  banReason: string | null;
};

export type PublicProfile = {
  handle: string;
  name: string;
  imageUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  redditUrl: string | null;
  joinedAt: string;
};

export type ProfileReview = {
  id: string;
  gameId: string;
  rating: number;
  body: string;
  createdAt: string;
  gameSlug: string;
  gameName: string;
  gameLogoUrl: string;
};

export type SavedGame = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  coverUrl: string;
  logoUrl: string;
  status: GameStatus;
  categories: GameCategoryItem[];
  platforms: GamePlatformItem[];
  archived?: boolean;
};

export type ProfileFeedKey =
  | "games:published"
  | "games:archived"
  | "games:all"
  | "followers"
  | "following"
  | "saved"
  | "liked"
  | "comments";

export type FollowProfile = {
  handle: string;
  name: string;
  imageUrl: string | null;
};

export type FollowState = {
  followerCount: number;
  followingCount: number;
  following: boolean;
};

export type GamePageData = {
  game: RankedGame;
  media: GameMediaItem[];
  links: GameLinkItem[];
  launches: GameLaunchItem[];
  isOwner: boolean;
  isAdmin: boolean;
  archived: boolean;
  iarcRating: IarcRating | null;
  reviewAverage: number | null;
  reviewCount: number;
  reviews: GameReviewItem[];
  reviewsNextCursor: string | null;
  viewerReview: { rating: number; body: string } | null;
  bookmarked: boolean;
  liked: boolean;
  likeCount: number;
};
