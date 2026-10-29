import type { GameLinkKind, GameStatus, IarcRating } from "@/lib/constants";
import type {
  GameCategoryItem,
  GameLaunchItem,
  GameMediaItem,
  GamePageData,
  GamePlatformItem,
  GameReviewItem,
  ProfileReview,
  PublicProfile,
  RankedGame,
  SavedGame,
  WeekBoard,
} from "@/lib/types";

type PublicCategory = {
  slug: string;
  name: string;
};

type PublicPlatform = {
  slug: string;
  name: string;
  logoUrl: string;
};

type PublicGameBase = {
  slug: string;
  name: string;
  tagline: string;
  coverUrl: string;
  logoUrl: string;
  trailerUrl: string | null;
  developerName: string;
  primaryUrl: string;
  status: GameStatus;
  categories: PublicCategory[];
  platforms: PublicPlatform[];
};

export type PublicBoardGame = PublicGameBase & {
  featured: boolean;
  voteCount: number;
  rank: number;
};

export type PublicTrendGame = PublicGameBase & {
  rank: number;
};

export type PublicCatalogGame = PublicGameBase;

export type PublicSavedGame = {
  slug: string;
  name: string;
  tagline: string;
  coverUrl: string;
  logoUrl: string;
  status: GameStatus;
  categories: PublicCategory[];
  platforms: PublicPlatform[];
};

export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  imageUrl: string | null;
  createdAt: string;
  handle: string | null;
};

export type PublicProfileReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  gameSlug: string;
  gameName: string;
  gameLogoUrl: string;
};

export type PublicProfileResponse = PublicProfile & {
  followerCount: number;
  followingCount: number;
};

export type PublicGame = PublicBoardGame & {
  description: string;
  iarcRating: IarcRating | null;
  likeCount: number;
  reviewAverage: number | null;
  reviewCount: number;
  media: Array<Pick<GameMediaItem, "kind" | "url" | "sortOrder">>;
  links: Array<{ kind: GameLinkKind; url: string }>;
  launches: GameLaunchItem[];
};

export type PublicWeek = {
  year: number;
  week: number;
  live: boolean;
  votingOpen: boolean;
  games: PublicBoardGame[];
};

function categoriesOf(items: GameCategoryItem[]): PublicCategory[] {
  return items.map((item) => ({ slug: item.slug, name: item.name }));
}

function platformsOf(items: GamePlatformItem[]): PublicPlatform[] {
  return items.map((item) => ({ slug: item.slug, name: item.name, logoUrl: item.logoUrl }));
}

function gameBase(game: RankedGame): PublicGameBase {
  return {
    slug: game.slug,
    name: game.name,
    tagline: game.tagline,
    coverUrl: game.coverUrl,
    logoUrl: game.logoUrl,
    trailerUrl: game.trailerUrl,
    developerName: game.developerName,
    primaryUrl: game.primaryUrl,
    status: game.status,
    categories: categoriesOf(game.categories),
    platforms: platformsOf(game.platforms),
  };
}

export function toPublicBoardGame(game: RankedGame): PublicBoardGame {
  return {
    ...gameBase(game),
    featured: game.featured,
    voteCount: game.voteCount,
    rank: game.rank,
  };
}

export function toPublicTrendGame(game: RankedGame): PublicTrendGame {
  return {
    ...gameBase(game),
    rank: game.rank,
  };
}

export function toPublicCatalogGame(game: RankedGame): PublicCatalogGame {
  return gameBase(game);
}

export function toPublicSavedGame(game: SavedGame): PublicSavedGame {
  return {
    slug: game.slug,
    name: game.name,
    tagline: game.tagline,
    coverUrl: game.coverUrl,
    logoUrl: game.logoUrl,
    status: game.status,
    categories: categoriesOf(game.categories),
    platforms: platformsOf(game.platforms),
  };
}

export function toPublicReview(review: GameReviewItem): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    displayName: review.displayName,
    imageUrl: review.imageUrl,
    createdAt: review.createdAt,
    handle: review.handle,
  };
}

export function toPublicProfileReview(review: ProfileReview): PublicProfileReview {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt,
    gameSlug: review.gameSlug,
    gameName: review.gameName,
    gameLogoUrl: review.gameLogoUrl,
  };
}

export function toPublicProfile(
  profile: PublicProfile & { clerkUserId?: string; email?: string | null },
  counts: { followerCount: number; followingCount: number },
): PublicProfileResponse {
  return {
    handle: profile.handle,
    name: profile.name,
    imageUrl: profile.imageUrl,
    coverUrl: profile.coverUrl,
    city: profile.city,
    country: profile.country,
    headline: profile.headline,
    bio: profile.bio,
    websiteUrl: profile.websiteUrl,
    xUrl: profile.xUrl,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    redditUrl: profile.redditUrl,
    joinedAt: profile.joinedAt,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
  };
}

export function toPublicGame(page: GamePageData): PublicGame {
  return {
    ...toPublicBoardGame(page.game),
    description: page.game.description,
    iarcRating: page.iarcRating,
    likeCount: page.likeCount,
    reviewAverage: page.reviewAverage,
    reviewCount: page.reviewCount,
    media: page.media.map((item) => ({
      kind: item.kind,
      url: item.url,
      sortOrder: item.sortOrder,
    })),
    links: page.links.map((item) => ({ kind: item.kind, url: item.url })),
    launches: page.launches.map((item) => ({
      year: item.year,
      week: item.week,
      live: item.live,
      featured: item.featured,
      voteCount: item.voteCount,
      rank: item.rank,
    })),
  };
}

export function toPublicWeek(board: WeekBoard): PublicWeek {
  return {
    year: board.year,
    week: board.week,
    live: board.live,
    votingOpen: board.votingOpen,
    games: board.games.map(toPublicBoardGame),
  };
}

export function toPublicPlatform(item: GamePlatformItem) {
  return { slug: item.slug, name: item.name, logoUrl: item.logoUrl };
}

export function toPublicCategory(item: GameCategoryItem) {
  return { slug: item.slug, name: item.name };
}
