import { sql, type SQL } from "drizzle-orm";

import { gamePlatforms, games, platforms, profiles } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import type { SearchGameHit, SearchPersonHit, SearchScope } from "@/lib/types";

const LIMIT = 8;

const FTS_STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "and",
  "or",
  "to",
  "for",
  "in",
  "on",
  "game",
  "games",
]);

type Signal = "prefix" | "fts" | "trigram";

const SIGNAL_RANK = {
  exact: 0,
  prefix: 1,
  fts: 2,
  trigram: 3,
} as const;

type GameRow = {
  slug: string;
  name: string;
  tagline: string;
  logo_url: string;
  signal: string;
};

type PersonRow = {
  handle: string;
  name: string;
  image_url: string | null;
  headline: string | null;
  signal: string;
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function ftsText(term: string) {
  const tokens = term
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !FTS_STOP.has(token));
  if (tokens.length === 0) return null;
  return tokens.join(" ");
}

function rankOf(signal: Signal, fields: string[], term: string) {
  const needle = term.toLowerCase();
  if (fields.some((field) => field.toLowerCase() === needle)) return SIGNAL_RANK.exact;
  if (fields.some((field) => field.toLowerCase().startsWith(needle))) {
    return Math.min(SIGNAL_RANK.prefix, SIGNAL_RANK[signal]);
  }
  return SIGNAL_RANK[signal];
}

function mergeRows<T>(
  groups: Array<{ signal: Signal; rows: T[] }>,
  term: string,
  fields: (row: T) => string[],
  key: (row: T) => string,
) {
  const best = new Map<string, { rank: number; order: number; row: T }>();
  let order = 0;
  for (const group of groups) {
    for (const row of group.rows) {
      const rank = rankOf(group.signal, fields(row), term);
      const id = key(row);
      const prev = best.get(id);
      if (!prev || rank < prev.rank) {
        best.set(id, { rank, order, row });
      }
      order += 1;
    }
  }
  return [...best.values()]
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, LIMIT)
    .map((item) => item.row);
}

function isSignal(value: string): value is Signal {
  return value === "prefix" || value === "fts" || value === "trigram";
}

async function queryRows<T extends Record<string, unknown>>(
  db: Pick<ReturnType<typeof getDb>, "execute">,
  statement: SQL,
) {
  const result = await db.execute<T>(statement);
  return result.rows;
}

function platformFilter(platform: string | null) {
  if (!platform) return sql``;
  return sql`and exists (
    select 1 from ${gamePlatforms}
    inner join ${platforms} on ${platforms.id} = ${gamePlatforms.platformId}
    where ${gamePlatforms.gameId} = ${games.id}
      and ${platforms.slug} = ${platform}
      and ${platforms.archivedAt} is null
  )`;
}

function gameBranch(match: SQL, order: SQL, platform: string | null, signal: Signal) {
  return sql`(
    select ${games.slug} as slug,
           ${games.name} as name,
           ${games.tagline} as tagline,
           ${games.logoUrl} as logo_url,
           ${signal}::text as signal
    from ${games}
    where ${games.archivedAt} is null
      and (${match})
      ${platformFilter(platform)}
    order by ${order}
    limit ${LIMIT}
  )`;
}

function personBranch(match: SQL, order: SQL, signal: Signal) {
  return sql`(
    select ${profiles.handle} as handle,
           ${profiles.name} as name,
           ${profiles.imageUrl} as image_url,
           ${profiles.headline} as headline,
           ${signal}::text as signal
    from ${profiles}
    where ${match}
    order by ${order}
    limit ${LIMIT}
  )`;
}

function groupBySignal<T extends { signal: string }>(rows: T[]) {
  const groups: Array<{ signal: Signal; rows: T[] }> = [
    { signal: "prefix", rows: [] },
    { signal: "fts", rows: [] },
    { signal: "trigram", rows: [] },
  ];
  const bySignal = new Map(groups.map((group) => [group.signal, group.rows]));
  for (const row of rows) {
    if (!isSignal(row.signal)) continue;
    bySignal.get(row.signal)?.push(row);
  }
  return groups;
}

async function searchGames(
  db: Pick<ReturnType<typeof getDb>, "execute">,
  term: string,
  platform: string | null,
): Promise<SearchGameHit[]> {
  const lowered = term.toLowerCase();
  const prefix = `${escapeLike(lowered)}%`;
  const branches = [
    gameBranch(
      sql`lower(${games.name}) like ${prefix} escape '\\'`,
      sql`lower(${games.name})`,
      platform,
      "prefix",
    ),
  ];

  const fts = ftsText(term);
  if (fts) {
    branches.push(sql`(
      with q as (
        select websearch_to_tsquery('simple', ${fts}) as tsq
      )
      select ${games.slug} as slug,
             ${games.name} as name,
             ${games.tagline} as tagline,
             ${games.logoUrl} as logo_url,
             'fts'::text as signal
      from ${games}
      cross join q
      where ${games.archivedAt} is null
        and q.tsq <> ''::tsquery
        and ${games.searchTsv} @@ q.tsq
        ${platformFilter(platform)}
      order by ts_rank_cd(${games.searchTsv}, q.tsq) desc
      limit ${LIMIT}
    )`);
  }

  if (lowered.length >= 3 && !FTS_STOP.has(lowered)) {
    const contains = `%${escapeLike(lowered)}%`;
    branches.push(
      gameBranch(
        sql`lower(${games.name}) ilike ${contains} escape '\\'`,
        sql`lower(${games.name})`,
        platform,
        "trigram",
      ),
      gameBranch(
        sql`lower(${games.developerName}) ilike ${contains} escape '\\'`,
        sql`lower(${games.developerName})`,
        platform,
        "trigram",
      ),
    );
  }

  if (lowered.length >= 4 && !FTS_STOP.has(lowered)) {
    branches.push(
      gameBranch(
        sql`${lowered} <% lower(${games.name})`,
        sql`word_similarity(${lowered}, lower(${games.name})) desc`,
        platform,
        "trigram",
      ),
      gameBranch(
        sql`${lowered} <% lower(${games.developerName})`,
        sql`word_similarity(${lowered}, lower(${games.developerName})) desc`,
        platform,
        "trigram",
      ),
    );
  }

  const rows = await queryRows<GameRow>(db, sql.join(branches, sql` union all `));
  return mergeRows(
    groupBySignal(rows),
    term,
    (row) => [row.name],
    (row) => row.slug,
  ).map((row) => ({
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    logoUrl: row.logo_url,
  }));
}

async function searchPeople(
  db: Pick<ReturnType<typeof getDb>, "execute">,
  term: string,
  handleOnly: boolean,
): Promise<SearchPersonHit[]> {
  const lowered = term.toLowerCase();
  const prefix = `${escapeLike(lowered)}%`;
  const branches: SQL[] = [
    personBranch(
      sql`lower(${profiles.handle}) like ${prefix} escape '\\'`,
      sql`lower(${profiles.handle})`,
      "prefix",
    ),
  ];

  if (!handleOnly) {
    branches.push(
      personBranch(
        sql`lower(${profiles.name}) like ${prefix} escape '\\'`,
        sql`lower(${profiles.name})`,
        "prefix",
      ),
    );
    const fts = ftsText(term);
    if (fts) {
      branches.push(sql`(
        with q as (
          select websearch_to_tsquery('simple', ${fts}) as tsq
        )
        select ${profiles.handle} as handle,
               ${profiles.name} as name,
               ${profiles.imageUrl} as image_url,
               ${profiles.headline} as headline,
               'fts'::text as signal
        from ${profiles}
        cross join q
        where q.tsq <> ''::tsquery
          and ${profiles.searchTsv} @@ q.tsq
        order by ts_rank_cd(${profiles.searchTsv}, q.tsq) desc
        limit ${LIMIT}
      )`);
    }
  }

  if (lowered.length >= 3 && !FTS_STOP.has(lowered)) {
    const contains = `%${escapeLike(lowered)}%`;
    branches.push(
      personBranch(
        sql`lower(${profiles.handle}) ilike ${contains} escape '\\'`,
        sql`lower(${profiles.handle})`,
        "trigram",
      ),
    );
    if (!handleOnly) {
      branches.push(
        personBranch(
          sql`lower(${profiles.name}) ilike ${contains} escape '\\'`,
          sql`lower(${profiles.name})`,
          "trigram",
        ),
      );
    }
  }

  if (lowered.length >= 4 && !FTS_STOP.has(lowered)) {
    branches.push(
      personBranch(
        sql`${lowered} <% lower(${profiles.handle})`,
        sql`word_similarity(${lowered}, lower(${profiles.handle})) desc`,
        "trigram",
      ),
    );
    if (!handleOnly) {
      branches.push(
        personBranch(
          sql`${lowered} <% lower(${profiles.name})`,
          sql`word_similarity(${lowered}, lower(${profiles.name})) desc`,
          "trigram",
        ),
      );
    }
  }

  const rows = await queryRows<PersonRow>(db, sql.join(branches, sql` union all `));
  return mergeRows(
    groupBySignal(rows),
    term,
    (row) => [row.name, row.handle],
    (row) => row.handle,
  ).map((row) => ({
    handle: row.handle,
    name: row.name,
    imageUrl: row.image_url,
    headline: row.headline,
  }));
}

export async function searchCatalog(input: {
  q: string;
  scope: SearchScope;
  platform: string | null;
}): Promise<{ games: SearchGameHit[]; people: SearchPersonHit[] }> {
  if (!hasDatabase()) return { games: [], people: [] };

  const raw = input.q.trim();
  const handleOnly = raw.startsWith("@");
  const term = (handleOnly ? raw.slice(1) : raw).trim();
  if (!term) return { games: [], people: [] };

  const db = getDb();
  const platform = input.scope === "people" || handleOnly ? null : input.platform;
  const includeGames = input.scope !== "people" && !handleOnly;
  const includePeople = input.scope !== "games" && !platform;

  async function ranked<T>(run: (tx: Pick<ReturnType<typeof getDb>, "execute">) => Promise<T>) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('pg_trgm.word_similarity_threshold', '0.4', true)`);
      return run(tx);
    });
  }

  const [gameHits, peopleHits] = await Promise.all([
    includeGames ? ranked((tx) => searchGames(tx, term, platform)) : Promise.resolve([]),
    includePeople ? ranked((tx) => searchPeople(tx, term, handleOnly)) : Promise.resolve([]),
  ]);

  return { games: gameHits, people: peopleHits };
}
