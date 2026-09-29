import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { AccountSettings } from "@/components/settings/account-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { ensureCurrentProfile } from "@/lib/profile";
import { getClerkAccount } from "@/lib/settings/account";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-fog uppercase">Account</p>
          <h1 className="text-2xl font-medium sm:text-[32px]">Settings</h1>
        </div>
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to manage settings</EmptyTitle>
            <EmptyDescription>
              Notification preferences and account sessions live here.
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
            <EmptyTitle>Settings are unavailable</EmptyTitle>
            <EmptyDescription>Try again once your account is connected.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
            Discover games
          </Button>
        </Empty>
      </div>
    );
  }

  const [preferences, accountResult] = await Promise.all([
    getNotificationPreferences(userId),
    getClerkAccount(userId).then(
      (account) => ({ account, error: null as string | null }),
      (error: unknown) => {
        console.error("[settings] clerk account failed", error);
        return { account: null, error: "Login details are unavailable right now." };
      },
    ),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-fog uppercase">Account</p>
        <h1 className="text-2xl font-medium sm:text-[32px]">Settings</h1>
      </div>
      <NotificationSettings preferences={preferences} />
      <AccountSettings
        name={profile.name}
        account={accountResult.account}
        accountError={accountResult.error}
      />
    </div>
  );
}
