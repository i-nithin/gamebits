import { and, eq, isNull, sql } from "drizzle-orm";

import { games } from "@/db/schema";

/** Games a public reader may see. Taken-down and ban-hidden rows stay out even if archived_at was cleared. */
export function publicGameWhere() {
  return and(isNull(games.archivedAt), isNull(games.takenDownAt), eq(games.hiddenByBan, false));
}

export function publicGameSql() {
  return sql`${games.archivedAt} is null and ${games.takenDownAt} is null and ${games.hiddenByBan} = false`;
}
