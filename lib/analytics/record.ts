import { gameAnalyticsEvents } from "@/db/schema";
import type { AnalyticsLinkKind } from "@/lib/analytics/links";
import { getDb, hasDatabase } from "@/lib/db";

export async function recordPageView(gameId: string, clerkUserId: string | null) {
  if (!hasDatabase()) return;
  const db = getDb();
  await db.insert(gameAnalyticsEvents).values({
    gameId,
    kind: "page_view",
    clerkUserId,
  });
}

export async function recordLinkClick(
  gameId: string,
  linkKind: AnalyticsLinkKind,
  clerkUserId: string | null,
) {
  if (!hasDatabase()) return;
  const db = getDb();
  await db.insert(gameAnalyticsEvents).values({
    gameId,
    kind: "link_click",
    linkKind,
    clerkUserId,
  });
}
