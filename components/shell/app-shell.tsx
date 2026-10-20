import Link from "next/link";

import { BanScreen } from "@/components/reports/ban-screen";
import { Footer } from "@/components/shell/footer";
import { LeftRail } from "@/components/shell/left-rail";
import { TopBar } from "@/components/shell/top-bar";
import { AuthDialogProvider } from "@/components/shell/auth-dialog";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { SearchModal } from "@/components/search/search-modal";
import { SearchProvider } from "@/components/search/search-provider";
import { formatDeletionDate } from "@/lib/account-deletion";
import type { GamePlatformItem, Viewer } from "@/lib/types";

export function AppShell({
  platforms,
  viewer,
  showAdminNav,
  children,
}: {
  platforms: GamePlatformItem[];
  viewer: Viewer | null;
  showAdminNav: boolean;
  children: React.ReactNode;
}) {
  if (viewer?.banned) {
    return <BanScreen reason={viewer.banReason} />;
  }

  const shell = (
    <>
      <div className="min-h-dvh bg-page">
        <LeftRail viewer={viewer} showAdminNav={showAdminNav} />
        <div data-app-shell className="flex min-h-dvh flex-col bg-page pt-14 md:pl-14">
          <TopBar viewer={viewer} showAdminNav={showAdminNav} />
          {viewer?.deletionDeadline ? (
            <div className="border-b border-iron bg-obsidian px-4 py-3 text-sm text-paper-white">
              {`Your account is scheduled for deletion on ${formatDeletionDate(viewer.deletionDeadline)}. `}
              <Link href="/settings/security" className="text-ice-signal underline">
                Restore
              </Link>
            </div>
          ) : null}
          <main className="flex-1 bg-page">{children}</main>
          <Footer />
        </div>
      </div>
      <SearchModal />
    </>
  );

  return (
    <SearchProvider platforms={platforms}>
      <AuthDialogProvider>
        {viewer ? <NotificationProvider>{shell}</NotificationProvider> : shell}
      </AuthDialogProvider>
    </SearchProvider>
  );
}
