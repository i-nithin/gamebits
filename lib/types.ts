import type { GameStatus } from "@/lib/constants";

export type SearchGame = {
  slug: string;
  name: string;
  tagline: string;
  coverUrl: string;
  voteCount: number;
};

export type RankedGame = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  coverUrl: string;
  trailerUrl: string | null;
  developerName: string;
  primaryUrl: string;
  status: GameStatus;
  tags: string[];
  platforms: string[];
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
