import { Footer } from "@/components/shell/footer";
import { LeftRail } from "@/components/shell/left-rail";
import { TopBar } from "@/components/shell/top-bar";
import { AuthDialogProvider } from "@/components/shell/auth-dialog";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { SearchModal } from "@/components/search/search-modal";
import { SearchProvider } from "@/components/search/search-provider";
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
  const shell = (
    <>
      <div className="min-h-dvh bg-obsidian">
        <LeftRail viewer={viewer} showAdminNav={showAdminNav} />
        <div className="flex min-h-dvh flex-col bg-charcoal pt-14 md:pl-14">
          <TopBar viewer={viewer} showAdminNav={showAdminNav} />
          <main className="flex-1 bg-charcoal">{children}</main>
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
