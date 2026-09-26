import { Footer } from "@/components/shell/footer";
import { LeftRail } from "@/components/shell/left-rail";
import { TopBar } from "@/components/shell/top-bar";
import { AuthDialogProvider } from "@/components/shell/auth-dialog";
import { SearchModal } from "@/components/search/search-modal";
import { SearchProvider } from "@/components/search/search-provider";
import type { SearchGame, Viewer } from "@/lib/types";

export function AppShell({
  currentWeekHref,
  searchGames,
  viewer,
  children,
}: {
  currentWeekHref: string;
  searchGames: SearchGame[];
  viewer: Viewer | null;
  children: React.ReactNode;
}) {
  return (
    <SearchProvider games={searchGames}>
      <AuthDialogProvider>
        <div className="min-h-dvh bg-void">
          <LeftRail currentWeekHref={currentWeekHref} viewer={viewer} />
          <div className="flex min-h-dvh flex-col bg-charcoal md:pl-14">
            <TopBar currentWeekHref={currentWeekHref} viewer={viewer} />
            <main className="flex-1 bg-charcoal">{children}</main>
            <Footer />
          </div>
        </div>
        <SearchModal />
      </AuthDialogProvider>
    </SearchProvider>
  );
}
