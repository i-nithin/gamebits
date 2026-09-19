import { Footer } from "@/components/shell/footer";
import { LeftRail } from "@/components/shell/left-rail";
import { TopBar } from "@/components/shell/top-bar";
import { SearchModal } from "@/components/search/search-modal";
import { SearchProvider } from "@/components/search/search-provider";
import type { SearchGame } from "@/lib/types";

export function AppShell({
  currentWeekHref,
  searchGames,
  children,
}: {
  currentWeekHref: string;
  searchGames: SearchGame[];
  children: React.ReactNode;
}) {
  return (
    <SearchProvider games={searchGames}>
      <div className="min-h-dvh bg-void">
        <LeftRail currentWeekHref={currentWeekHref} />
        <div className="flex min-h-dvh flex-col bg-charcoal md:pl-14">
          <TopBar currentWeekHref={currentWeekHref} />
          <main className="flex-1 bg-charcoal">{children}</main>
          <Footer />
        </div>
        <SearchModal />
      </div>
    </SearchProvider>
  );
}
