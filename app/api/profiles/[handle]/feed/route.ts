import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileByHandle } from "@/lib/profile";
import {
  listProfileBookmarksPage,
  listProfileFollowersPage,
  listProfileFollowingPage,
  listProfileGamesPage,
  listProfileLikesPage,
  listProfileReviewsPage,
} from "@/lib/queries";
import type { ProfileFeedKey } from "@/lib/types";

const FEED_KEYS = new Set<ProfileFeedKey>([
  "games:published",
  "games:archived",
  "games:all",
  "followers",
  "following",
  "saved",
  "liked",
  "comments",
]);

const OWNER_ONLY_FEEDS = new Set<ProfileFeedKey>([
  "games:archived",
  "games:all",
  "saved",
  "liked",
  "comments",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const url = new URL(request.url);
  const feed = url.searchParams.get("feed") as ProfileFeedKey | null;
  if (!feed || !FEED_KEYS.has(feed)) {
    return NextResponse.json({ error: "Invalid feed" }, { status: 400 });
  }

  const [profile, viewerId] = await Promise.all([getProfileByHandle(handle), getCurrentUserId()]);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = viewerId === profile.clerkUserId;
  if (OWNER_ONLY_FEEDS.has(feed) && !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const options = {
    userId: profile.clerkUserId,
    cursor: url.searchParams.get("cursor"),
    query: url.searchParams.get("q")?.slice(0, 100) ?? null,
  };

  const page =
    feed === "games:published"
      ? await listProfileGamesPage({ ...options, view: "published" })
      : feed === "games:archived"
        ? await listProfileGamesPage({ ...options, view: "archived" })
        : feed === "games:all"
          ? await listProfileGamesPage({ ...options, view: "all" })
          : feed === "followers"
            ? await listProfileFollowersPage(options)
            : feed === "following"
              ? await listProfileFollowingPage(options)
              : feed === "saved"
                ? await listProfileBookmarksPage(options)
                : feed === "liked"
                  ? await listProfileLikesPage(options)
                  : await listProfileReviewsPage(options);

  return NextResponse.json(page, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
