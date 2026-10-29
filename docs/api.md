# Public API

Read-only catalog for servers and agents. Votes, reviews, follows, and game edits stay in the product.

OpenAPI 3.1 is `GET /api/v1/openapi.json`. Agent notes are `GET /llms.txt`. Both are public and cached (`public, max-age=300, s-maxage=3600`). Their absolute origin comes from `NEXT_PUBLIC_APP_URL`. When that is unset, they use relative paths.

Code lives in [`app/api/v1/`](../app/api/v1/), [`lib/api/`](../lib/api/), and [`app/api/mcp/route.ts`](../app/api/mcp/route.ts).

## Request

```http
Authorization: Bearer gb_live_...
```

Do not put the key in the query string. There are no CORS headers.

The token is stored and checked as a SHA-256 hash. Data responses send `Cache-Control: private, no-store`. A public CDN cache would skip the key check, and caching by `Authorization` would miss for every caller. After the key is accepted, repeat reads of the same URL share one Upstash copy.

| Response | TTL |
|----------|-----|
| Search | 15s |
| Live weeks, reviews, and ended weeks that are not snapshotted yet | 30s |
| Games, profiles, trending, catalog | 60s |
| Ended weeks with a stored final rank | 5 min |
| Platforms, categories | 10 min |

Week reads do not snapshot ranks, and trending reads do not recompute scores. Those jobs stay on the crons. Until an ended week has a `finalRank` on every listing, the board is ordered by current votes.

Revoke, ban, account deletion, and purge invalidate the key immediately. `last_used_at` updates at most every 15 minutes. Successful responses include `X-RateLimit-Limit` and `X-RateLimit-Remaining` for the tighter of the minute and day windows. Production returns 503 when Upstash is missing.

| Bucket | Limit | Key |
|--------|-------|-----|
| Minute | 60 / 60s, sliding | API key |
| Day | 5,000 / 24h, fixed | API key |
| Failed auth | 20 / 60s | Client IP |
| Key create | 10 / hour | Signed-in user |

```json
{ "error": { "code": "unauthorized", "message": "Missing API key" } }
```

| Status | `code` | When |
|--------|--------|------|
| 400 | `invalid_request` | Bad query or path |
| 401 | `unauthorized` | Missing, malformed, unknown, expired, or revoked key. Sends `WWW-Authenticate: Bearer realm="gamebits"` |
| 404 | `not_found` | Missing game or profile, or a game that is archived, taken down, or hidden by a ban |
| 429 | `rate_limited` | Includes `Retry-After` |
| 503 | `unavailable` | Redis missing in production, or the read failed |

## Keys

Create a key at **Settings → Developer**. The secret is shown once. The list shows `gb_live_` plus the next 8 characters, and the last 4.

| Rule | Value |
|------|--------|
| Live keys | 5 per account |
| Creates | 10 per hour |
| Name | Required, at most 40 characters |
| Scope | `read` |
| Expiry | 7 days, 30 days (default), 90 days, 1 year, or none |

Expired and revoked keys fail auth. A banned, deleted, or purged profile fails too. Expired keys stay in the list with a red dot and do not count toward the cap. Active keys show a green dot.

## Responses

List routes take `cursor` and `limit`. `limit` defaults to 24 and maxes at 50. `cursor` is opaque, 1–200 characters of `[A-Za-z0-9_-]`. Pass `nextCursor` back as `cursor`. It is `null` on the last page.

```json
{ "items": [], "nextCursor": null }
```

Filters are comma-separated slugs, at most 10: `platform`, `category`, and `status` (`released`, `upcoming`, `early_access`, `demo`, `playtest`, `unreleased`).

Responses never include Clerk ids, email, `pageViews`, `outboundClicks`, whether the caller voted, owner or admin flags, bookmark or like state, moderation fields, or follower lists.

A game card is `slug`, `name`, `tagline`, `coverUrl`, `logoUrl`, `trailerUrl`, `developerName`, `primaryUrl`, `status`, `categories[]` `{ slug, name }`, and `platforms[]` `{ slug, name, logoUrl }`.

| Surface | Extra fields |
|---------|----------------|
| Week | `featured`, `voteCount`, `rank` |
| Trending | `rank` (snapshot rank, not the week vote rank) |
| Catalog | None of those |
| Profile games | No `trailerUrl`, `developerName`, or `primaryUrl` |

Description, media, store links, and launches are only on game detail.

## Routes

All of these are `GET` under `/api/v1`.

`/weeks/current` and `/weeks/{year}/{week}` return `{ year, week, live, votingOpen, games }`. `year` is 2000–2100. `week` is 1–53. `live` is the current ISO week. `votingOpen` is true once that week has started. Games are week cards.

`/games/{slug}` is a week card plus `description` (stored HTML), `iarcRating` (`"3"`, `"7"`, `"12"`, `"16"`, `"18"`, or `null`), `likeCount`, `reviewAverage`, `reviewCount`, `media[]` `{ kind, url, sortOrder }` (`image` or `video`), `links[]` `{ kind, url }` (`web`, `steam`, `playstore`, `appstore`, `nintendo`, `playstation`, `xbox`, `discord`, `x`), and `launches[]` `{ year, week, live, featured, voteCount, rank }`. `slug` is lowercase and hyphenated, at most 80 characters. Review text is not embedded.

`/games/{slug}/reviews` is a page of `{ id, rating, body, displayName, imageUrl, createdAt, handle }`. `handle` is `null` when the author has no public profile.

`/search` requires `q` (1–80 characters). `scope` is `all` (default), `games`, or `people`. `platform` is an optional slug and filters games. The body is `{ games: [{ slug, name, tagline, logoUrl }], people: [{ handle, name, imageUrl, headline }] }`. The in-app modal still uses `/api/search`.

`/trending` takes `range` (`today` by default, or `1d`, `week`, `month`), the shared filters, and paging. The body is `{ range, items, nextCursor }`. Items are trend cards. See [trending.md](trending.md).

`/catalog` takes `sort` (`newest` by default, or `name`, `status`), optional `dir` (`asc` or `desc`), the shared filters, and paging. Items are catalog cards.

`/platforms` and `/categories` return `{ items }`. A platform is `{ slug, name, logoUrl }`. A category is `{ slug, name }`.

`/profiles/{handle}` returns `handle`, `name`, `imageUrl`, `coverUrl`, `city`, `country`, `headline`, `bio`, `websiteUrl`, `xUrl`, `githubUrl`, `linkedinUrl`, `redditUrl`, `joinedAt`, `followerCount`, and `followingCount`. `handle` is 3–30 characters, `[a-z0-9_]`.

`/profiles/{handle}/games` and `/profiles/{handle}/reviews` are paged. Profile games are the shorter card above. Profile reviews are `{ id, rating, body, createdAt, gameSlug, gameName, gameLogoUrl }` for games that are still public.

## MCP

`POST /api/mcp` is stateless Streamable HTTP. `GET` and `DELETE` use the same handler. Responses are JSON, there is no session, and the body cap is 64 KB. The same bearer key and read functions are used. Tools are read-only. List filters are arrays, not comma-separated strings. A missing game or profile is an error result with the text `Not found`.

| Tool | Arguments |
|------|-----------|
| `get_current_week` | |
| `get_week` | `year`, `week` |
| `get_game` | `slug` |
| `list_game_reviews` | `slug`, optional `cursor`, `limit` |
| `search` | `q`, optional `scope`, `platform` |
| `list_trending` | optional `range`, `platforms[]`, `categories[]`, `statuses[]`, `cursor`, `limit` |
| `list_catalog` | optional `sort`, `dir`, `platforms[]`, `categories[]`, `statuses[]`, `cursor`, `limit` |
| `list_platforms` | |
| `list_categories` | |
| `get_profile` | `handle` |
| `list_profile_games` | `handle`, optional `cursor`, `limit` |
| `list_profile_reviews` | `handle`, optional `cursor`, `limit` |

Send `Accept: application/json, text/event-stream`.

```json
{
  "mcpServers": {
    "gamebits": {
      "url": "https://example.com/api/mcp",
      "headers": { "Authorization": "Bearer gb_live_..." }
    }
  }
}
```
