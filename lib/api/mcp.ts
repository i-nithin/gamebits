import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  readCatalog,
  readCategories,
  readCurrentWeek,
  readGame,
  readGameReviews,
  readPlatforms,
  readProfile,
  readProfileGames,
  readProfileReviews,
  readSearch,
  readTrending,
  readWeek,
} from "@/lib/api/catalog";
import { GAME_STATUSES } from "@/lib/constants";
import { TREND_RANGES } from "@/lib/trending/periods";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const slugList = z.array(slug).max(10).optional();
const statuses = z.array(z.enum(GAME_STATUSES)).max(GAME_STATUSES.length).optional();
const limit = z.number().int().min(1).max(50).optional();
const cursor = z.string().trim().regex(/^[A-Za-z0-9_-]{1,200}$/).optional();

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function missingResult() {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: "Not found" }],
  };
}

export function createGamebitsMcp() {
  const server = new McpServer({ name: "gamebits", version: "1.0.0" });

  server.registerTool(
    "get_current_week",
    {
      description: "Current ISO week board: ranked games, live flag, and whether voting is open.",
      annotations: readOnly,
    },
    async () => jsonResult(await readCurrentWeek()),
  );

  server.registerTool(
    "get_week",
    {
      description: "ISO week board. Ended weeks use the stored final rank once it has been snapshotted.",
      inputSchema: { year: z.number().int().min(2000).max(2100), week: z.number().int().min(1).max(53) },
      annotations: readOnly,
    },
    async ({ year, week }) => jsonResult(await readWeek(year, week)),
  );

  server.registerTool(
    "get_game",
    {
      description: "Public game page: description, media, store links, launches, and review totals.",
      inputSchema: { slug },
      annotations: readOnly,
    },
    async ({ slug: gameSlug }) => {
      const game = await readGame(gameSlug);
      return game ? jsonResult(game) : missingResult();
    },
  );

  server.registerTool(
    "list_game_reviews",
    {
      description: "Reviews for a game. Pass nextCursor back as cursor.",
      inputSchema: { slug, cursor, limit },
      annotations: readOnly,
    },
    async ({ slug: gameSlug, cursor: pageCursor, limit: pageLimit }) => {
      const page = await readGameReviews(gameSlug, pageCursor, pageLimit);
      return page ? jsonResult(page) : missingResult();
    },
  );

  server.registerTool(
    "search",
    {
      description: "Search games and people. scope is all, games, or people.",
      inputSchema: {
        q: z.string().trim().min(1).max(80),
        scope: z.enum(["all", "games", "people"]).optional(),
        platform: slug.optional(),
      },
      annotations: readOnly,
    },
    async ({ q, scope, platform }) =>
      jsonResult(await readSearch({ q, scope: scope ?? "all", platform: platform ?? null })),
  );

  server.registerTool(
    "list_trending",
    {
      description: "Trending games from the latest snapshot. range is today, 1d, week, or month.",
      inputSchema: {
        range: z.enum(TREND_RANGES).optional(),
        platforms: slugList,
        categories: slugList,
        statuses,
        cursor,
        limit,
      },
      annotations: readOnly,
    },
    async (input) =>
      jsonResult(
        await readTrending({
          range: input.range ?? "today",
          platforms: input.platforms ?? [],
          categories: input.categories ?? [],
          statuses: input.statuses ?? [],
          cursor: input.cursor,
          limit: input.limit,
        }),
      ),
  );

  server.registerTool(
    "list_catalog",
    {
      description: "Catalog of published games. sort is newest, name, or status.",
      inputSchema: {
        sort: z.enum(["newest", "name", "status"]).optional(),
        dir: z.enum(["asc", "desc"]).optional(),
        platforms: slugList,
        categories: slugList,
        statuses,
        cursor,
        limit,
      },
      annotations: readOnly,
    },
    async (input) =>
      jsonResult(
        await readCatalog({
          sort: input.sort ?? "newest",
          dir: input.dir,
          platforms: input.platforms ?? [],
          categories: input.categories ?? [],
          statuses: input.statuses ?? [],
          cursor: input.cursor,
          limit: input.limit,
        }),
      ),
  );

  server.registerTool(
    "list_platforms",
    { description: "Active platforms.", annotations: readOnly },
    async () => jsonResult(await readPlatforms()),
  );

  server.registerTool(
    "list_categories",
    { description: "Active categories.", annotations: readOnly },
    async () => jsonResult(await readCategories()),
  );

  server.registerTool(
    "get_profile",
    {
      description: "Public profile and follower counts. Does not include email or account ids.",
      inputSchema: { handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/) },
      annotations: readOnly,
    },
    async ({ handle }) => {
      const profile = await readProfile(handle);
      return profile ? jsonResult(profile) : missingResult();
    },
  );

  server.registerTool(
    "list_profile_games",
    {
      description: "Published games for a profile.",
      inputSchema: { handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/), cursor, limit },
      annotations: readOnly,
    },
    async ({ handle, cursor: pageCursor, limit: pageLimit }) => {
      const page = await readProfileGames(handle, pageCursor, pageLimit);
      return page ? jsonResult(page) : missingResult();
    },
  );

  server.registerTool(
    "list_profile_reviews",
    {
      description: "Reviews written on a public profile.",
      inputSchema: { handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/), cursor, limit },
      annotations: readOnly,
    },
    async ({ handle, cursor: pageCursor, limit: pageLimit }) => {
      const page = await readProfileReviews(handle, pageCursor, pageLimit);
      return page ? jsonResult(page) : missingResult();
    },
  );

  return server;
}
