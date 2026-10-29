import { z } from "zod";

import { GAME_STATUSES, type GameStatus } from "@/lib/constants";
import { TREND_RANGES } from "@/lib/trending/periods";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);

export const API_PAGE_LIMIT = 24;

export const pageQuery = z.object({
  cursor: z.string().trim().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(80),
  scope: z.enum(["all", "games", "people"]),
  platform: z.string().trim().max(80).regex(/^[a-z0-9-]*$/),
});

export const weekParams = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(53),
});

export const gameSlugParam = z.object({
  slug: slug,
});

export const handleParam = z.object({
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
});

export const catalogQuery = pageQuery.extend({
  sort: z.enum(["newest", "name", "status"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export const trendQuery = pageQuery.extend({
  range: z.enum(TREND_RANGES).optional(),
});

function listParam(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function parseSlugList(value: string | null) {
  const items = listParam(value);
  if (items.length > 10) return null;
  const parsed = z.array(slug).safeParse(items);
  return parsed.success ? parsed.data : null;
}

export function readPage(url: URL) {
  const cursor = url.searchParams.get("cursor");
  const limit = url.searchParams.get("limit");
  const parsed = pageQuery.safeParse({
    ...(cursor ? { cursor } : {}),
    ...(limit ? { limit } : {}),
  });
  return parsed.success ? parsed.data : null;
}

export function readFilters(url: URL) {
  const platforms = parseSlugList(url.searchParams.get("platform"));
  const categories = parseSlugList(url.searchParams.get("category"));
  const statuses = parseStatuses(url.searchParams.get("status"));
  if (!platforms || !categories || !statuses) return null;
  return { platforms, categories, statuses };
}

export function parseStatuses(value: string | null) {
  const items = listParam(value);
  if (items.length > GAME_STATUSES.length) return null;
  const allowed = new Set<string>(GAME_STATUSES);
  if (!items.every((item) => allowed.has(item))) return null;
  return items as GameStatus[];
}
