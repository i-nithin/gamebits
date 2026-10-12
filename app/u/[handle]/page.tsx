import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileHeader } from "@/components/profile/profile-header";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileByHandle } from "@/lib/profile";
import { profileTab } from "@/lib/profile-tab";
import {
  getFollowState,
  listArchivedGames,
  listBookmarks,
  listFollowers,
  listFollowing,
  listLikes,
  listProfileReviews,
  listPublishedGames,
} from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Profile" };
  return {
    title: `${profile.name} · GameBits`,
    description: profile.headline || profile.bio || `${profile.name} on GameBits`,
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

  const [published, saved, liked, comments, followers, following, follow, archived] =
    await Promise.all([
      listPublishedGames(profile.clerkUserId),
      isOwner ? listBookmarks(profile.clerkUserId) : Promise.resolve([]),
      isOwner ? listLikes(profile.clerkUserId) : Promise.resolve([]),
      isOwner ? listProfileReviews(profile.clerkUserId) : Promise.resolve([]),
      listFollowers(profile.clerkUserId),
      listFollowing(profile.clerkUserId),
      getFollowState(userId, profile.clerkUserId),
      isOwner ? listArchivedGames(profile.clerkUserId) : Promise.resolve([]),
    ]);

  return (
    <ProfileHeader
      profile={profile}
      isOwner={isOwner}
      follow={follow}
      gameCount={published.length}
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
