import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileHeader } from "@/components/profile/profile-header";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileByHandle } from "@/lib/profile";
import { profileTab } from "@/lib/profile-tab";
import {
  countPublishedGames,
  getFollowState,
  listProfileBookmarksPage,
  listProfileFollowersPage,
  listProfileFollowingPage,
  listProfileGamesPage,
  listProfileLikesPage,
  listProfileReviewsPage,
} from "@/lib/queries";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}): Promise<Metadata> {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Profile" };
  const isPrivateTab = ["archived", "saved", "liked", "comments"].includes(
    query.tab ?? "",
  );
  return {
    title: `${profile.name}${query.tab && query.tab !== "games" ? ` · ${query.tab}` : ""}`,
    description: profile.headline || profile.bio || `${profile.name} on GameBits`,
    ...(isPrivateTab ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ handle }, query, userId] = await Promise.all([
    params,
    searchParams,
    getCurrentUserId(),
  ]);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  const isOwner = userId === profile.clerkUserId;
  const tab = profileTab(query.tab, isOwner);
  const privateTab =
    query.tab === "archived" ||
    query.tab === "saved" ||
    query.tab === "liked" ||
    query.tab === "comments";
  if (handle !== profile.handle || (privateTab && !isOwner)) {
    const suffix = tab === "games" ? "" : `?tab=${tab}`;
    redirect(`/u/${profile.handle}${suffix}`);
  }

  const { clerkUserId: profileUserId, ...publicProfile } = profile;
  const userIdForLists = profileUserId;
  const empty = Promise.resolve({ items: [], nextCursor: null });
  const [published, saved, liked, comments, followers, following, follow, archived, gameCount] =
    await Promise.all([
      listProfileGamesPage({ userId: userIdForLists, view: "published" }),
      isOwner ? listProfileBookmarksPage({ userId: userIdForLists }) : empty,
      isOwner ? listProfileLikesPage({ userId: userIdForLists }) : empty,
      isOwner ? listProfileReviewsPage({ userId: userIdForLists }) : empty,
      listProfileFollowersPage({ userId: userIdForLists }),
      listProfileFollowingPage({ userId: userIdForLists }),
      getFollowState(userId, userIdForLists),
      isOwner ? listProfileGamesPage({ userId: userIdForLists, view: "archived" }) : empty,
      countPublishedGames(userIdForLists),
    ]);

  return (
    <ProfileHeader
      profile={publicProfile}
      isOwner={isOwner}
      follow={follow}
      gameCount={gameCount}
    >
      <ProfileGames
        handle={profile.handle}
        tab={tab}
        isOwner={isOwner}
        published={published}
        archived={archived}
        saved={saved}
        liked={liked}
        comments={comments}
        followers={followers}
        following={following}
      />
    </ProfileHeader>
  );
}
