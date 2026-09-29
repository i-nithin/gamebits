import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BookmarkList } from "@/components/game/bookmark-list";
import { ProfileComments } from "@/components/profile/profile-comments";
import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePeople } from "@/components/profile/profile-people";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile, getProfileByHandle } from "@/lib/profile";
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
import type { FollowProfile, ProfileReview, SavedGame } from "@/lib/types";

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

function GamePanel({
  games,
  title,
  description,
}: {
  games: SavedGame[];
  title: string;
  description: string;
}) {
  if (games.length === 0) {
    return (
      <Empty className="border border-dashed border-iron">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <BookmarkList games={games} showBookmark={false} />;
}

function PeoplePanel({
  people,
  title,
  description,
}: {
  people: FollowProfile[];
  title: string;
  description: string;
}) {
  if (people.length === 0) {
    return (
      <Empty className="border border-dashed border-iron">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <ProfilePeople people={people} />;
}

function CommentPanel({
  reviews,
  isOwner,
}: {
  reviews: ProfileReview[];
  isOwner: boolean;
}) {
  if (reviews.length === 0) {
    return (
      <Empty className="border border-dashed border-iron">
        <EmptyHeader>
          <EmptyTitle>No comments</EmptyTitle>
          <EmptyDescription>
            {isOwner
              ? "Reviews you post on games will show up here."
              : "Reviews this person posts will show up here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return <ProfileComments reviews={reviews} />;
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

  const [published, saved, liked, comments, followers, following, follow, archived, own] =
    await Promise.all([
      listPublishedGames(profile.clerkUserId),
      isOwner ? listBookmarks(profile.clerkUserId) : Promise.resolve([]),
      isOwner ? listLikes(profile.clerkUserId) : Promise.resolve([]),
      isOwner ? listProfileReviews(profile.clerkUserId) : Promise.resolve([]),
      listFollowers(profile.clerkUserId),
      listFollowing(profile.clerkUserId),
      getFollowState(userId, profile.clerkUserId),
      isOwner ? listArchivedGames(profile.clerkUserId) : Promise.resolve([]),
      isOwner ? ensureCurrentProfile() : Promise.resolve(null),
    ]);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        email={own?.email ?? null}
        follow={follow}
      />
      <ProfileGames
        handle={profile.handle}
        tab={tab}
        isOwner={isOwner}
        panels={{
          games: isOwner ? (
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-paper-white">Published</h2>
                <GamePanel
                  games={published}
                  title="No published games"
                  description="Games you add will show up here."
                />
              </section>
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-paper-white">Archived</h2>
                <GamePanel
                  games={archived}
                  title="No archived games"
                  description="Games you archive will show up here."
                />
              </section>
            </div>
          ) : (
            <GamePanel
              games={published}
              title="No games"
              description="Games this person publishes will show up here."
            />
          ),
          saved: (
            <GamePanel
              games={saved}
              title="No bookmarks"
              description="Saved games will show up here."
            />
          ),
          liked: (
            <GamePanel
              games={liked}
              title="No liked games"
              description="Liked games will show up here."
            />
          ),
          comments: <CommentPanel reviews={comments} isOwner={isOwner} />,
          followers: (
            <PeoplePanel
              people={followers}
              title="No followers"
              description={
                isOwner ? "People who follow you will show up here." : "Followers will show up here."
              }
            />
          ),
          following: (
            <PeoplePanel
              people={following}
              title="Not following anyone"
              description={
                isOwner
                  ? "People you follow will show up here."
                  : "People this person follows will show up here."
              }
            />
          ),
        }}
      />
    </div>
  );
}
