import Link from "next/link";

import { AdbitsNav } from "@/components/ads/adbits-nav";
import { OpenAuthButton } from "@/components/shell/open-auth-button";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { accountBlockReason, getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";

export const metadata = {
  title: "Advertise on GameBits",
  robots: { index: false, follow: false },
};

export default async function AdbitsLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-fog uppercase">Advertise</p>
          <h1 className="text-2xl font-medium sm:text-[32px]">Adbits</h1>
        </div>
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to book an ad</EmptyTitle>
            <EmptyDescription>
              Bookings stay on your account, including ones you place again.
            </EmptyDescription>
          </EmptyHeader>
          {clerkEnabled ? (
            <OpenAuthButton className="rounded-full">Sign in</OpenAuthButton>
          ) : null}
        </Empty>
      </div>
    );
  }

  const reason = await accountBlockReason(userId);
  if (reason === "banned" || reason === "closed") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-xs tracking-wide text-fog uppercase">Advertise</p>
          <h1 className="text-2xl font-medium sm:text-[32px]">Adbits</h1>
        </div>
        <p className="text-sm text-fog">
          {reason === "banned"
            ? "This account is banned."
            : "This account is closed. Restore it in settings before booking an ad."}
        </p>
        {reason === "closed" ? (
          <Button
            variant="outline"
            className="w-fit rounded-full"
            render={<Link href="/settings/security" />}
            nativeButton={false}
          >
            Security
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6rem)] w-full flex-col gap-2 overflow-hidden px-4 pt-0 pb-3 md:flex-row md:items-stretch md:gap-5 md:px-5 md:py-4">
      <AdbitsNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
