import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BookmarkList } from "@/components/game/bookmark-list";
import { ProfileComments } from "@/components/profile/profile-comments";
import { ProfileGames } from "@/components/profile/profile-games";
import { ProfileHeader } from "@/components/profile/profile-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile, getProfileByHandle } from "@/lib/profile";
import { profileTab } from "@/lib/profile-tab";
import { listBookmarks, listLikes, listProfileReviews, listPublishedGames } from "@/lib/queries";
import type { ProfileReview, SavedGame } from "@/lib/types";

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
  const tab = profileTab(query.tab);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  if (handle !== profile.handle) {
    const suffix = tab === "published" ? "" : `?tab=${tab}`;
    redirect(`/u/${profile.handle}${suffix}`);
  }

  const isOwner = userId === profile.clerkUserId;
  const [games, own] = await Promise.all([
    Promise.all([
      listPublishedGames(profile.clerkUserId),
      listBookmarks(profile.clerkUserId),
      listLikes(profile.clerkUserId),
      listProfileReviews(profile.clerkUserId),
    ]),
    isOwner ? ensureCurrentProfile() : Promise.resolve(null),
  ]);
  const [published, saved, liked, comments] = games;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <ProfileHeader profile={profile} isOwner={isOwner} email={own?.email ?? null} />
      <ProfileGames
        handle={profile.handle}
        tab={tab}
        panels={{
          published: (
            <GamePanel
              games={published}
              title="No published games"
              description={
                isOwner
                  ? "Games you add will show up here."
                  : "Games this person publishes will show up here."
              }
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
        }}
      />
    </div>
  );
}
