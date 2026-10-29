import Link from "next/link";

import { SettingsNav } from "@/components/settings/settings-nav";
import { SignOutExpired } from "@/components/settings/sign-out-expired";
import { OpenAuthButton } from "@/components/shell/open-auth-button";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getSettingsGate } from "@/lib/settings/gate";

export const metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const gate = await getSettingsGate();

  if (gate.status === "signed-out") {
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
              Profile, notifications, security, and API keys live here.
            </EmptyDescription>
          </EmptyHeader>
          {clerkEnabled ? (
            <OpenAuthButton className="rounded-full">Sign in</OpenAuthButton>
          ) : null}
        </Empty>
      </div>
    );
  }

  if (gate.status === "removed") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-fog uppercase">Account</p>
          <h1 className="text-2xl font-medium sm:text-[32px]">Settings</h1>
        </div>
        <p className="text-sm text-fog">This login has been removed.</p>
        <SignOutExpired />
      </div>
    );
  }

  if (gate.status === "unavailable") {
    return (
      <div className="mx-auto flex max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Settings are unavailable</EmptyTitle>
            <EmptyDescription>Try again once your account is connected.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="rounded-full" render={<Link href="/" />} nativeButton={false}>
            Discover games
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6rem)] w-full flex-col gap-2 overflow-hidden px-4 pt-0 pb-3 md:flex-row md:items-stretch md:gap-5 md:px-5 md:py-4">
      <SettingsNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
