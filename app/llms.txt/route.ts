import { documentedOrigin } from "@/lib/api/origin";

export function GET() {
  const origin = documentedOrigin();
  const body = `# GameBits

GameBits is a weekly game discovery board. A game is placed on an ISO week, and that week's upvote count sets the rank. After the week ends, the rank stays frozen.

## Public API

Read-only HTTP API: ${origin}/api/v1
OpenAPI: ${origin}/api/v1/openapi.json
Authorization: Bearer gb_live_...

Create a key while signed in at ${origin}/settings/developer. The secret is shown once. Store only a hash of it on the server.

The API does not send CORS headers. Call it from a server or an agent.

Reads cover the current and past week boards, games, reviews, search, trending, the catalog, platforms, categories, and public profiles. Archived and taken-down games are omitted. Email addresses, account ids, analytics, and votes by person are omitted.

There is no write API. Votes, reviews, follows, and game edits stay in the product.

## MCP

Stateless Streamable HTTP: POST ${origin}/api/mcp
Use the same bearer key. Responses are JSON, with no session.

Tools: get_current_week, get_week, get_game, list_game_reviews, search, list_trending, list_catalog, list_platforms, list_categories, get_profile, list_profile_games, list_profile_reviews.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
