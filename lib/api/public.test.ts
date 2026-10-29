import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { boardRankMode, weekCacheSeconds } from "../week-rank";
import type { GamePageData, GameReviewItem, RankedGame } from "../types";
import { toPublicBoardGame, toPublicGame, toPublicProfile, toPublicReview } from "./dto";
import { documentedOrigin } from "./origin";
import { apiKeyAccess, apiKeyExpiresAt, describeApiToken, hashApiToken, isApiKeyExpired, isApiToken } from "./token";

const secret = `${"abcdefgh"}${"x".repeat(31)}wxyz`;
const token = `gb_live_${secret}`;

const ranked = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "tide",
  name: "Tide",
  tagline: "A quiet coast",
  description: "<p>Long description</p>",
  coverUrl: "https://example.com/cover.png",
  logoUrl: "https://example.com/logo.png",
  trailerUrl: null,
  developerName: "North",
  primaryUrl: "https://example.com/play",
  status: "released",
  categories: [{ id: "cat", slug: "puzzle", name: "Puzzle" }],
  platforms: [{ id: "plat", slug: "steam", name: "Steam", logoUrl: "https://example.com/steam.png" }],
  outboundClicks: 42,
  featured: true,
  voteCount: 7,
  voted: true,
  rank: 1,
} satisfies RankedGame;

describe("api tokens", () => {
  it("describes a live key without keeping the secret", () => {
    assert.equal(secret.length, 43);
    assert.equal(isApiToken(token), true);
    assert.equal(isApiToken("gb_live_short"), false);
    assert.deepEqual(describeApiToken(token), {
      keyPrefix: "gb_live_abcdefgh",
      keyLast4: "wxyz",
    });
  });

  it("stores a sha256 hash of the full token", () => {
    const expected = createHash("sha256").update(token).digest("hex");
    assert.equal(hashApiToken(token), expected);
    assert.equal(hashApiToken(token).length, 64);
    assert.notEqual(hashApiToken(token), token);
  });
});

describe("api key access", () => {
  const active = {
    revokedAt: null,
    expiresAt: null,
    scopes: ["read"],
    bannedAt: null,
    deletedAt: null,
    purgedAt: null,
  };

  it("accepts a live read key", () => {
    assert.equal(apiKeyAccess(active), "ok");
  });

  it("rejects revoked, banned, deleted, purged, expired, and non-read keys", () => {
    const now = new Date("2026-10-29T00:00:00.000Z");
    assert.equal(apiKeyAccess({ ...active, revokedAt: new Date() }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, bannedAt: new Date() }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, deletedAt: new Date() }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, purgedAt: new Date() }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, scopes: ["write"] }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, expiresAt: new Date("2026-10-28T00:00:00.000Z") }, now), "inactive");
    assert.equal(apiKeyAccess({ ...active, expiresAt: new Date("2026-11-28T00:00:00.000Z") }, now), "ok");
    assert.equal(isApiKeyExpired(null, now), false);
    const expires = apiKeyExpiresAt("30d", now);
    assert.ok(expires);
    assert.equal(expires.getTime() - now.getTime(), 30 * 24 * 60 * 60 * 1000);
    assert.equal(apiKeyExpiresAt("never", now), null);
  });
});

describe("week ranks", () => {
  it("keeps a closed week on live ordering until every final rank is stored", () => {
    assert.equal(boardRankMode(true, [1, null, 3]), "live");
    assert.equal(boardRankMode(true, [1, 2]), "frozen");
    assert.equal(boardRankMode(false, [1, 2]), "live");
    assert.equal(weekCacheSeconds(false), 30);
    assert.equal(weekCacheSeconds(true), 300);
  });
});

describe("documented origin", () => {
  it("uses only the configured app url", () => {
    assert.equal(documentedOrigin("https://gamebits.example/"), "https://gamebits.example");
    assert.equal(documentedOrigin(""), "");
  });
});

describe("public DTOs", () => {
  it("strips private game fields from board cards", () => {
    const card = toPublicBoardGame(ranked);
    assert.equal(card.slug, "tide");
    assert.equal(card.voteCount, 7);
    assert.equal(card.categories[0]?.slug, "puzzle");
    assert.equal("id" in card, false);
    assert.equal("description" in card, false);
    assert.equal("outboundClicks" in card, false);
    assert.equal("voted" in card, false);
    assert.equal("id" in card.categories[0], false);
    assert.equal("id" in card.platforms[0], false);
  });

  it("keeps detail text and drops viewer and owner state", () => {
    const review = {
      id: "review-1",
      rating: 5,
      body: "Sharp",
      displayName: "Ada",
      imageUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      handle: "ada",
    } satisfies GameReviewItem;
    const page = {
      game: ranked,
      media: [{ id: "media", kind: "image", url: "https://example.com/shot.png", sortOrder: 0 }],
      links: [{ kind: "steam", url: "https://example.com/steam" }],
      launches: [{ year: 2026, week: 1, live: true, featured: true, voteCount: 7, rank: 1 }],
      isOwner: true,
      isAdmin: true,
      archived: false,
      iarcRating: null,
      reviewAverage: 5,
      reviewCount: 1,
      reviews: [review],
      reviewsNextCursor: null,
      viewerReview: { rating: 5, body: "Sharp" },
      bookmarked: true,
      liked: true,
      likeCount: 3,
    } satisfies GamePageData;

    const body = JSON.parse(JSON.stringify(toPublicGame(page))) as Record<string, unknown>;
    assert.equal(body.description, "<p>Long description</p>");
    assert.equal(body.likeCount, 3);
    assert.equal("outboundClicks" in body, false);
    assert.equal("voted" in body, false);
    assert.equal("isOwner" in body, false);
    assert.equal("isAdmin" in body, false);
    assert.equal("bookmarked" in body, false);
    assert.equal("viewerReview" in body, false);
    assert.equal("reviews" in body, false);
    const media = body.media as Array<Record<string, unknown>>;
    assert.equal("id" in media[0], false);

    const publicReview = toPublicReview({ ...review, clerkUserId: "user_secret" } as GameReviewItem & {
      clerkUserId: string;
    });
    assert.equal("clerkUserId" in publicReview, false);
  });

  it("omits account ids and email from profiles", () => {
    const profile = toPublicProfile(
      {
        clerkUserId: "user_secret",
        email: "ada@example.com",
        handle: "ada",
        name: "Ada",
        imageUrl: null,
        coverUrl: null,
        city: null,
        country: null,
        headline: null,
        bio: null,
        websiteUrl: null,
        xUrl: null,
        githubUrl: null,
        linkedinUrl: null,
        redditUrl: null,
        joinedAt: "2026-01-01T00:00:00.000Z",
      },
      { followerCount: 2, followingCount: 4 },
    );
    assert.equal(profile.handle, "ada");
    assert.equal(profile.followerCount, 2);
    assert.equal("clerkUserId" in profile, false);
    assert.equal("email" in profile, false);
  });
});
