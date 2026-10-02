import { and, asc, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";

import {
  categories,
  gameCategories,
  gamePlatforms,
  games,
  platforms,
  profiles,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import type { AdminPageSize, CatalogView } from "@/lib/admin/params";

export {
  ADMIN_PAGE_SIZES,
  adminListHref,
  parseAdminListParams,
  type AdminPageSize,
  type CatalogView,
} from "@/lib/admin/params";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function contains(query: string) {
  return `%${escapeLike(query.toLowerCase())}%`;
}

function pageWindow(total: number, requested: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(requested, pageCount);
}

async function loadPage<T>(
  requested: number,
  pageSize: number,
  totalPromise: Promise<number>,
  load: (offset: number) => Promise<T[]>,
) {
  const [total, first] = await Promise.all([
    totalPromise,
    load((requested - 1) * pageSize),
  ]);
  const page = pageWindow(total, requested, pageSize);
  if (page === requested || total === 0) {
    return { items: first, total, page, pageSize };
  }
  const items = await load((page - 1) * pageSize);
  return { items, total, page, pageSize };
}

async function countFrom(
  table: typeof profiles | typeof games | typeof categories | typeof platforms,
  where?: SQL,
) {
  const db = getDb();
  const query = db.select({ value: sql<number>`count(*)::int` }).from(table);
  const [row] = where ? await query.where(where) : await query;
  return row?.value ?? 0;
}

function archivedFilter(
  column: typeof categories.archivedAt | typeof platforms.archivedAt,
  view: CatalogView,
) {
  if (view === "live") return isNull(column);
  if (view === "archived") return isNotNull(column);
  return undefined;
}

function andWhere(parts: Array<SQL | undefined>) {
  const filters = parts.filter((part): part is SQL => Boolean(part));
  if (filters.length === 0) return undefined;
  return and(...filters);
}

export type AdminUserRow = {
  clerkUserId: string;
  handle: string;
  name: string;
  email: string | null;
  joinedAt: string;
  superAdmin: boolean;
};

export async function listAdminUsers(input: {
  query: string;
  page: number;
  pageSize: AdminPageSize;
}) {
  await requireAdmin();
  const db = getDb();
  const pattern = input.query ? contains(input.query) : null;
  const where = pattern
    ? sql`(
        lower(${profiles.name}) ilike ${pattern} escape '\\'
        or lower(${profiles.handle}) ilike ${pattern} escape '\\'
        or lower(coalesce(${profiles.email}, '')) ilike ${pattern} escape '\\'
      )`
    : undefined;

  const [result, superAdminCount] = await Promise.all([
    loadPage(input.page, input.pageSize, countFrom(profiles, where), async (offset) => {
    const base = db
      .select({
        clerkUserId: profiles.clerkUserId,
        handle: profiles.handle,
        name: profiles.name,
        email: profiles.email,
        joinedAt: profiles.joinedAt,
        superAdmin: profiles.superAdmin,
      })
      .from(profiles);
    const filtered = where ? base.where(where) : base;
    return filtered
      .orderBy(desc(profiles.joinedAt), desc(profiles.clerkUserId))
      .limit(input.pageSize)
      .offset(offset);
    }),
    countFrom(profiles, eq(profiles.superAdmin, true)),
  ]);

  return {
    ...result,
    items: result.items.map((row) => ({
      ...row,
      joinedAt: row.joinedAt.toISOString(),
    })) satisfies AdminUserRow[],
    superAdminCount,
  };
}

export type AdminGameRow = {
  id: string;
  slug: string;
  name: string;
  developerName: string;
  status: string;
  outboundClicks: number;
  archived: boolean;
};

export async function listAdminGames(input: {
  query: string;
  page: number;
  pageSize: AdminPageSize;
}) {
  await requireAdmin();
  const db = getDb();
  const pattern = input.query ? contains(input.query) : null;
  const where = pattern
    ? sql`(
        lower(${games.name}) ilike ${pattern} escape '\\'
        or lower(${games.slug}) ilike ${pattern} escape '\\'
        or lower(${games.developerName}) ilike ${pattern} escape '\\'
      )`
    : undefined;

  const result = await loadPage(input.page, input.pageSize, countFrom(games, where), async (offset) => {
    const base = db
      .select({
        id: games.id,
        slug: games.slug,
        name: games.name,
        developerName: games.developerName,
        status: games.status,
        outboundClicks: games.outboundClicks,
        archivedAt: games.archivedAt,
      })
      .from(games);
    const filtered = where ? base.where(where) : base;
    return filtered.orderBy(desc(games.createdAt), desc(games.id)).limit(input.pageSize).offset(offset);
  });

  return {
    ...result,
    items: result.items.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      developerName: row.developerName,
      status: row.status,
      outboundClicks: row.outboundClicks,
      archived: Boolean(row.archivedAt),
    })) satisfies AdminGameRow[],
  };
}

export type AdminCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  archived: boolean;
  gameCount: number;
};

export async function listAdminCategories(input: {
  query: string;
  page: number;
  pageSize: AdminPageSize;
  view: CatalogView;
}) {
  await requireAdmin();
  const db = getDb();
  const pattern = input.query ? contains(input.query) : null;
  const where = andWhere([
    archivedFilter(categories.archivedAt, input.view),
    pattern
      ? sql`(
          lower(${categories.name}) ilike ${pattern} escape '\\'
          or lower(${categories.slug}) ilike ${pattern} escape '\\'
        )`
      : undefined,
  ]);

  const result = await loadPage(
    input.page,
    input.pageSize,
    countFrom(categories, where),
    async (offset) => {
      const base = db
        .select({
          id: categories.id,
          slug: categories.slug,
          name: categories.name,
          sortOrder: categories.sortOrder,
          archivedAt: categories.archivedAt,
        })
        .from(categories);
      const filtered = where ? base.where(where) : base;
      return filtered
        .orderBy(asc(categories.sortOrder), asc(categories.name), asc(categories.id))
        .limit(input.pageSize)
        .offset(offset);
    },
  );

  const ids = result.items.map((row) => row.id);
  const counts =
    ids.length === 0
      ? []
      : await db
          .select({
            id: gameCategories.categoryId,
            value: sql<number>`count(*)::int`,
          })
          .from(gameCategories)
          .where(inArray(gameCategories.categoryId, ids))
          .groupBy(gameCategories.categoryId);
  const countById = new Map(counts.map((row) => [row.id, row.value]));

  return {
    ...result,
    items: result.items.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      sortOrder: row.sortOrder,
      archived: Boolean(row.archivedAt),
      gameCount: countById.get(row.id) ?? 0,
    })) satisfies AdminCategoryRow[],
  };
}

export type AdminPlatformRow = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  sortOrder: number;
  archived: boolean;
  gameCount: number;
};

export async function listAdminPlatforms(input: {
  query: string;
  page: number;
  pageSize: AdminPageSize;
  view: CatalogView;
}) {
  await requireAdmin();
  const db = getDb();
  const pattern = input.query ? contains(input.query) : null;
  const where = andWhere([
    archivedFilter(platforms.archivedAt, input.view),
    pattern
      ? sql`(
          lower(${platforms.name}) ilike ${pattern} escape '\\'
          or lower(${platforms.slug}) ilike ${pattern} escape '\\'
        )`
      : undefined,
  ]);

  const result = await loadPage(
    input.page,
    input.pageSize,
    countFrom(platforms, where),
    async (offset) => {
      const base = db
        .select({
          id: platforms.id,
          slug: platforms.slug,
          name: platforms.name,
          logoUrl: platforms.logoUrl,
          sortOrder: platforms.sortOrder,
          archivedAt: platforms.archivedAt,
        })
        .from(platforms);
      const filtered = where ? base.where(where) : base;
      return filtered
        .orderBy(asc(platforms.sortOrder), asc(platforms.name), asc(platforms.id))
        .limit(input.pageSize)
        .offset(offset);
    },
  );

  const ids = result.items.map((row) => row.id);
  const counts =
    ids.length === 0
      ? []
      : await db
          .select({
            id: gamePlatforms.platformId,
            value: sql<number>`count(*)::int`,
          })
          .from(gamePlatforms)
          .where(inArray(gamePlatforms.platformId, ids))
          .groupBy(gamePlatforms.platformId);
  const countById = new Map(counts.map((row) => [row.id, row.value]));

  return {
    ...result,
    items: result.items.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      logoUrl: row.logoUrl,
      sortOrder: row.sortOrder,
      archived: Boolean(row.archivedAt),
      gameCount: countById.get(row.id) ?? 0,
    })) satisfies AdminPlatformRow[],
  };
}
