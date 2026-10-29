const gameCard = {
  type: "object",
  required: ["slug", "name", "tagline", "coverUrl", "logoUrl", "developerName", "primaryUrl", "status", "categories", "platforms"],
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    tagline: { type: "string" },
    coverUrl: { type: "string" },
    logoUrl: { type: "string" },
    trailerUrl: { type: "string", nullable: true },
    developerName: { type: "string" },
    primaryUrl: { type: "string" },
    status: { $ref: "#/components/schemas/GameStatus" },
    categories: { type: "array", items: { $ref: "#/components/schemas/Category" } },
    platforms: { type: "array", items: { $ref: "#/components/schemas/Platform" } },
  },
} as const;

const pageParams = [
  {
    name: "cursor",
    in: "query",
    schema: { type: "string", maxLength: 200 },
    description: "Page cursor from a previous nextCursor.",
  },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 50, default: 24 },
  },
] as const;

const filterParams = [
  {
    name: "platform",
    in: "query",
    schema: { type: "string" },
    description: "Comma-separated platform slugs. At most 10.",
  },
  {
    name: "category",
    in: "query",
    schema: { type: "string" },
    description: "Comma-separated category slugs. At most 10.",
  },
  {
    name: "status",
    in: "query",
    schema: { type: "string" },
    description: "Comma-separated statuses: released, upcoming, early_access, demo, playtest, unreleased.",
  },
] as const;

function jsonContent(schema: Record<string, unknown>) {
  return { "application/json": { schema } };
}

function ok(schema: Record<string, unknown>) {
  return { 200: { description: "OK", content: jsonContent(schema) } };
}

export function openApiDocument(origin: string) {
  const base = origin ? `${origin}/api/v1` : "/api/v1";
  return {
    openapi: "3.1.0",
    info: {
      title: "GameBits",
      version: "1.0.0",
      description:
        "Read-only catalog for the weekly game board. Send Authorization: Bearer gb_live_… Keys are created in Settings → Developer. This API does not accept browser CORS.",
    },
    servers: [{ url: base }],
    security: [{ bearer: [] }],
    components: {
      securitySchemes: {
        bearer: { type: "http", scheme: "bearer", bearerFormat: "API key" },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  enum: ["unauthorized", "rate_limited", "unavailable", "not_found", "invalid_request"],
                },
                message: { type: "string" },
              },
            },
          },
        },
        GameStatus: {
          type: "string",
          enum: ["released", "upcoming", "early_access", "demo", "playtest", "unreleased"],
        },
        Category: {
          type: "object",
          required: ["slug", "name"],
          properties: { slug: { type: "string" }, name: { type: "string" } },
        },
        Platform: {
          type: "object",
          required: ["slug", "name", "logoUrl"],
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            logoUrl: { type: "string" },
          },
        },
        BoardGame: {
          allOf: [
            gameCard,
            {
              type: "object",
              required: ["featured", "voteCount", "rank"],
              properties: {
                featured: { type: "boolean" },
                voteCount: { type: "integer" },
                rank: { type: "integer" },
              },
            },
          ],
        },
        Page: {
          type: "object",
          required: ["items", "nextCursor"],
          properties: {
            items: { type: "array", items: {} },
            nextCursor: { type: "string", nullable: true },
          },
        },
      },
    },
    paths: {
      "/weeks/current": {
        get: {
          operationId: "getCurrentWeek",
          summary: "Current ISO week board",
          responses: ok({
            type: "object",
            properties: {
              year: { type: "integer" },
              week: { type: "integer" },
              live: { type: "boolean" },
              votingOpen: { type: "boolean" },
              games: { type: "array", items: { $ref: "#/components/schemas/BoardGame" } },
            },
          }),
        },
      },
      "/weeks/{year}/{week}": {
        get: {
          operationId: "getWeek",
          summary: "ISO week board",
          parameters: [
            { name: "year", in: "path", required: true, schema: { type: "integer" } },
            { name: "week", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 53 } },
          ],
          responses: ok({
            type: "object",
            properties: {
              year: { type: "integer" },
              week: { type: "integer" },
              live: { type: "boolean" },
              votingOpen: { type: "boolean" },
              games: { type: "array", items: { $ref: "#/components/schemas/BoardGame" } },
            },
          }),
        },
      },
      "/games/{slug}": {
        get: {
          operationId: "getGame",
          summary: "Game detail",
          description: "Includes description, media, store links, and launch history. Review text is on /games/{slug}/reviews.",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: ok({ type: "object" }),
        },
      },
      "/games/{slug}/reviews": {
        get: {
          operationId: "listGameReviews",
          summary: "Game reviews",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }, ...pageParams],
          responses: ok({ $ref: "#/components/schemas/Page" }),
        },
      },
      "/search": {
        get: {
          operationId: "search",
          summary: "Search games and people",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 80 } },
            {
              name: "scope",
              in: "query",
              schema: { type: "string", enum: ["all", "games", "people"], default: "all" },
            },
            { name: "platform", in: "query", schema: { type: "string" } },
          ],
          responses: ok({ type: "object" }),
        },
      },
      "/trending": {
        get: {
          operationId: "listTrending",
          summary: "Trending games",
          description: "Reads the latest trend snapshot. It does not recompute scores.",
          parameters: [
            {
              name: "range",
              in: "query",
              schema: { type: "string", enum: ["today", "1d", "week", "month"], default: "today" },
            },
            ...filterParams,
            ...pageParams,
          ],
          responses: ok({ type: "object" }),
        },
      },
      "/catalog": {
        get: {
          operationId: "listCatalog",
          summary: "Catalog games",
          parameters: [
            {
              name: "sort",
              in: "query",
              schema: { type: "string", enum: ["newest", "name", "status"], default: "newest" },
            },
            { name: "dir", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
            ...filterParams,
            ...pageParams,
          ],
          responses: ok({ $ref: "#/components/schemas/Page" }),
        },
      },
      "/platforms": {
        get: {
          operationId: "listPlatforms",
          summary: "Active platforms",
          responses: ok({ type: "object" }),
        },
      },
      "/categories": {
        get: {
          operationId: "listCategories",
          summary: "Active categories",
          responses: ok({ type: "object" }),
        },
      },
      "/profiles/{handle}": {
        get: {
          operationId: "getProfile",
          summary: "Public profile",
          parameters: [{ name: "handle", in: "path", required: true, schema: { type: "string" } }],
          responses: ok({ type: "object" }),
        },
      },
      "/profiles/{handle}/games": {
        get: {
          operationId: "listProfileGames",
          summary: "Published games for a profile",
          parameters: [{ name: "handle", in: "path", required: true, schema: { type: "string" } }, ...pageParams],
          responses: ok({ $ref: "#/components/schemas/Page" }),
        },
      },
      "/profiles/{handle}/reviews": {
        get: {
          operationId: "listProfileReviews",
          summary: "Reviews written by a profile",
          parameters: [{ name: "handle", in: "path", required: true, schema: { type: "string" } }, ...pageParams],
          responses: ok({ $ref: "#/components/schemas/Page" }),
        },
      },
    },
  };
}
