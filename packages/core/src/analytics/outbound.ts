import { and, eq } from "drizzle-orm";

import { gameLinks } from "@gamebits/db/schema";
import { isAnalyticsLinkKind, type AnalyticsLinkKind } from "./links";
import { getDb, hasDatabase } from "@gamebits/db";

export async function resolveOutboundDestination(opts: {
  gameId: string;
  primaryUrl: string;
  kind: string | null;
}): Promise<{ url: string; linkKind: AnalyticsLinkKind } | null> {
  const requested = opts.kind == null ? "primary" : opts.kind;
  if (!isAnalyticsLinkKind(requested)) return null;
  if (requested === "primary") {
    return { url: opts.primaryUrl, linkKind: "primary" };
  }
  if (!hasDatabase()) return null;

  const db = getDb();
  const [link] = await db
    .select({ url: gameLinks.url })
    .from(gameLinks)
    .where(and(eq(gameLinks.gameId, opts.gameId), eq(gameLinks.kind, requested)))
    .limit(1);

  if (!link) return null;
  return { url: link.url, linkKind: requested };
}
