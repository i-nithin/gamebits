import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { BookmarkList } from "@/components/game/bookmark-list";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { listBookmarks } from "@/lib/queries";

export default async function BookmarksPage() {
  const userId = await getCurrentUserId();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-fog uppercase">Library</p>
        <h1 className="text-2xl font-medium sm:text-[32px]">Saved</h1>
        <p className="text-sm text-fog">Games you bookmarked</p>
      </div>
      {!userId ? (
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to save games</EmptyTitle>
            <EmptyDescription>
              Bookmarks stay on your account so you can open them later.
            </EmptyDescription>
          </EmptyHeader>
          {clerkEnabled ? (
            <SignInButton mode="modal">
              <Button variant="outline" className="rounded-full">
                Sign in
              </Button>
            </SignInButton>
          ) : null}
        </Empty>
      ) : (
        <SavedGames userId={userId} />
      )}
    </div>
  );
}

async function SavedGames({ userId }: { userId: string }) {
  const games = await listBookmarks(userId);
  if (games.length === 0) {
    return (
      <Empty className="border border-dashed border-iron">
        <EmptyHeader>
          <EmptyTitle>No saved games</EmptyTitle>
          <EmptyDescription>Bookmark a game and it will show up here.</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
          Discover games
        </Button>
      </Empty>
    );
  }

  return <BookmarkList games={games} />;
}
