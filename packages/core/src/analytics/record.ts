import { and, eq, isNull, sql } from "drizzle-orm";

import { gameAnalyticsDaily, gameAnalyticsEvents, games } from "@gamebits/db/schema";
import type { AnalyticsLinkKind } from "./links";
import { getDb, hasDatabase } from "@gamebits/db";

function utcDayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function bumpCountrySql(country: string, pageViewDelta: number, linkClickDelta: number) {
  return sql`
    jsonb_set(
      coalesce(${gameAnalyticsDaily.countries}, '{}'::jsonb),
      array[${country}]::text[],
      jsonb_build_object(
        'pageViews',
        coalesce((${gameAnalyticsDaily.countries} -> ${country} ->> 'pageViews')::int, 0)
          + ${pageViewDelta},
        'linkClicks',
        coalesce((${gameAnalyticsDaily.countries} -> ${country} ->> 'linkClicks')::int, 0)
          + ${linkClickDelta}
      ),
      true
    )
  `;
}

export async function recordPageView(
  gameId: string,
  clerkUserId: string | null,
  country: string | null = null,
) {
  if (!hasDatabase()) return;
  const db = getDb();
  const day = utcDayString();
  const countries = country ? { [country]: { pageViews: 1, linkClicks: 0 } } : {};

  await db.insert(gameAnalyticsEvents).values({
    gameId,
    kind: "page_view",
    clerkUserId,
    country,
  });

  await Promise.all([
    db
      .insert(gameAnalyticsDaily)
      .values({
        gameId,
        day,
        pageViews: 1,
        linkClicks: 0,
        clicks: {},
        countries,
      })
      .onConflictDoUpdate({
        target: [gameAnalyticsDaily.gameId, gameAnalyticsDaily.day],
        set: {
          pageViews: sql`${gameAnalyticsDaily.pageViews} + 1`,
          ...(country ? { countries: bumpCountrySql(country, 1, 0) } : {}),
        },
      }),
    db
      .update(games)
      .set({
        pageViews: sql`${games.pageViews} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(games.id, gameId), isNull(games.archivedAt))),
  ]);
}

export async function recordLinkClick(
  gameId: string,
  linkKind: AnalyticsLinkKind,
  clerkUserId: string | null,
  country: string | null = null,
) {
  if (!hasDatabase()) return;
  const db = getDb();
  const day = utcDayString();
  const countries = country ? { [country]: { pageViews: 0, linkClicks: 1 } } : {};

  await db.insert(gameAnalyticsEvents).values({
    gameId,
    kind: "link_click",
    linkKind,
    clerkUserId,
    country,
  });

  await Promise.all([
    db
      .insert(gameAnalyticsDaily)
      .values({
        gameId,
        day,
        pageViews: 0,
        linkClicks: 1,
        clicks: { [linkKind]: 1 },
        countries,
      })
      .onConflictDoUpdate({
        target: [gameAnalyticsDaily.gameId, gameAnalyticsDaily.day],
        set: {
          linkClicks: sql`${gameAnalyticsDaily.linkClicks} + 1`,
          clicks: sql`coalesce(${gameAnalyticsDaily.clicks}, '{}'::jsonb) || jsonb_build_object(
            ${linkKind}::text,
            coalesce((${gameAnalyticsDaily.clicks} ->> ${linkKind})::int, 0) + 1
          )`,
          ...(country ? { countries: bumpCountrySql(country, 0, 1) } : {}),
        },
      }),
    db
      .update(games)
      .set({
        outboundClicks: sql`${games.outboundClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(games.id, gameId), isNull(games.archivedAt))),
  ]);
}
