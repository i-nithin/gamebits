import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { ensureCurrentProfile } from "@/lib/profile";

export default async function ProfileIndexPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-fog uppercase">Account</p>
          <h1 className="text-2xl font-medium sm:text-[32px]">Profile</h1>
        </div>
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to view your profile</EmptyTitle>
            <EmptyDescription>
              Your name, games, bookmarks, and likes live on your profile.
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
      </div>
    );
  }

  const profile = await ensureCurrentProfile();
  if (!profile) {
    return (
      <div className="mx-auto flex max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Profile is unavailable</EmptyTitle>
            <EmptyDescription>Try again once your account is connected.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
            Discover games
          </Button>
        </Empty>
      </div>
    );
  }

  redirect(`/u/${profile.handle}`);
}
