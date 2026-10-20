import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, ne, sql, type SQL } from "drizzle-orm";

import { gameReviews, games, profiles, reports } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import type { AdminPageSize, ReportQueueStatus } from "@/lib/admin/params";
import { getDb } from "@/lib/db";
import { isUuid } from "@/lib/sanitize";

export function parseReportStatus(raw?: string): ReportQueueStatus {
  if (raw === "actioned" || raw === "dismissed" || raw === "all") return raw;
  return "open";
}

export type AdminReportRow = {
  id: string;
  targetType: "review" | "game";
  targetId: string;
  reason: string;
  status: "open" | "dismissed" | "actioned";
  createdAt: string;
  subjectName: string | null;
  subjectHandle: string | null;
  authorName: string | null;
  targetLabel: string;
  gameName: string | null;
  warningCount: number;
};

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function andWhere(parts: Array<SQL | undefined>) {
  const filters = parts.filter((part): part is SQL => Boolean(part));
  if (filters.length === 0) return undefined;
  return and(...filters);
}

export async function listAdminReports(input: {
  query: string;
  page: number;
  pageSize: AdminPageSize;
  status: ReportQueueStatus;
}) {
  await requireAdmin();
  const db = getDb();
  const reviewGame = alias(games, "review_game");
  const targetGame = alias(games, "target_game");
  const pattern = input.query ? `%${escapeLike(input.query.toLowerCase())}%` : null;
  const where = andWhere([
    input.status === "all" ? undefined : eq(reports.status, input.status),
    pattern
      ? sql`(
          lower(coalesce(${profiles.name}, '')) ilike ${pattern} escape '\\'
          or lower(coalesce(${profiles.handle}, '')) ilike ${pattern} escape '\\'
          or lower(coalesce(${gameReviews.body}, '')) ilike ${pattern} escape '\\'
          or lower(coalesce(${reviewGame.name}, '')) ilike ${pattern} escape '\\'
          or lower(coalesce(${targetGame.name}, '')) ilike ${pattern} escape '\\'
          or lower(${reports.reason}) ilike ${pattern} escape '\\'
        )`
      : undefined,
  ]);

  const base = () =>
    db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
        subjectClerkUserId: reports.subjectClerkUserId,
        subjectName: profiles.name,
        subjectHandle: profiles.handle,
        reviewBody: gameReviews.body,
        reviewAuthor: gameReviews.displayName,
        reviewGameName: reviewGame.name,
        gameName: targetGame.name,
        warningCount: sql<number>`(
          select count(*)::int
          from reports as report_count
          where report_count.subject_clerk_user_id = ${reports.subjectClerkUserId}
            and report_count.status <> 'dismissed'
        )`,
      })
      .from(reports)
      .leftJoin(profiles, eq(profiles.clerkUserId, reports.subjectClerkUserId))
      .leftJoin(
        gameReviews,
        and(eq(reports.targetType, "review"), eq(gameReviews.id, reports.targetId)),
      )
      .leftJoin(reviewGame, eq(reviewGame.id, gameReviews.gameId))
      .leftJoin(
        targetGame,
        and(eq(reports.targetType, "game"), eq(targetGame.id, reports.targetId)),
      );

  const countQuery = db
    .select({ value: sql<number>`count(*)::int` })
    .from(reports)
    .leftJoin(profiles, eq(profiles.clerkUserId, reports.subjectClerkUserId))
    .leftJoin(
      gameReviews,
      and(eq(reports.targetType, "review"), eq(gameReviews.id, reports.targetId)),
    )
    .leftJoin(reviewGame, eq(reviewGame.id, gameReviews.gameId))
    .leftJoin(
      targetGame,
      and(eq(reports.targetType, "game"), eq(targetGame.id, reports.targetId)),
    );
  const [counted] = where ? await countQuery.where(where) : await countQuery;
  const total = counted?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.pageSize;
  const filtered = where ? base().where(where) : base();
  const rows = await filtered
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(input.pageSize)
    .offset(offset);

  return {
    total,
    page,
    pageSize: input.pageSize,
    items: rows.map((row) => ({
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      subjectName: row.subjectName,
      subjectHandle: row.subjectHandle,
      authorName: row.reviewAuthor,
      targetLabel:
        row.targetType === "review"
          ? row.reviewBody?.slice(0, 80) || "Comment"
          : row.gameName || "Game",
      gameName: row.targetType === "review" ? row.reviewGameName : row.gameName,
      warningCount: row.subjectClerkUserId ? row.warningCount : 0,
    })) satisfies AdminReportRow[],
  };
}

export async function getAdminReport(id: string) {
  await requireAdmin();
  if (!isUuid(id)) return null;
  const db = getDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report) return null;

  const reporterPromise = db
    .select({ name: profiles.name, handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.clerkUserId, report.reporterClerkUserId))
    .limit(1);
  const subjectPromise = report.subjectClerkUserId
    ? db
        .select({
          clerkUserId: profiles.clerkUserId,
          name: profiles.name,
          handle: profiles.handle,
          bannedAt: profiles.bannedAt,
          superAdmin: profiles.superAdmin,
        })
        .from(profiles)
        .where(eq(profiles.clerkUserId, report.subjectClerkUserId))
        .limit(1)
    : Promise.resolve([]);
  const reviewPromise =
    report.targetType === "review"
      ? db
          .select({
            id: gameReviews.id,
            body: gameReviews.body,
            displayName: gameReviews.displayName,
            rating: gameReviews.rating,
            removedAt: gameReviews.removedAt,
            removedByBan: gameReviews.removedByBan,
            gameName: games.name,
            gameSlug: games.slug,
          })
          .from(gameReviews)
          .innerJoin(games, eq(games.id, gameReviews.gameId))
          .where(eq(gameReviews.id, report.targetId))
          .limit(1)
      : Promise.resolve([]);
  const gamePromise =
    report.targetType === "game"
      ? db
          .select({
            id: games.id,
            name: games.name,
            slug: games.slug,
            logoUrl: games.logoUrl,
            takenDownAt: games.takenDownAt,
            hiddenByBan: games.hiddenByBan,
            archivedAt: games.archivedAt,
          })
          .from(games)
          .where(eq(games.id, report.targetId))
          .limit(1)
      : Promise.resolve([]);
  const priorPromise = report.subjectClerkUserId
    ? db
        .select({
          id: reports.id,
          reason: reports.reason,
          status: reports.status,
          targetType: reports.targetType,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(and(eq(reports.subjectClerkUserId, report.subjectClerkUserId), ne(reports.id, report.id)))
        .orderBy(desc(reports.createdAt))
        .limit(8)
    : Promise.resolve([]);
  const warningPromise = report.subjectClerkUserId
    ? db
        .select({ value: sql<number>`count(*)::int` })
        .from(reports)
        .where(
          and(eq(reports.subjectClerkUserId, report.subjectClerkUserId), ne(reports.status, "dismissed")),
        )
    : Promise.resolve([{ value: 0 }]);

  const [reporter, subject, review, game, prior, warning] = await Promise.all([
    reporterPromise,
    subjectPromise,
    reviewPromise,
    gamePromise,
    priorPromise,
    warningPromise,
  ]);

  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    details: report.details,
    status: report.status,
    resolution: report.resolution,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    reporter: reporter[0] ?? null,
    subject: subject[0]
      ? {
          ...subject[0],
          bannedAt: subject[0].bannedAt?.toISOString() ?? null,
        }
      : null,
    review: review[0]
      ? { ...review[0], removedAt: review[0].removedAt?.toISOString() ?? null }
      : null,
    game: game[0]
      ? { ...game[0], takenDownAt: game[0].takenDownAt?.toISOString() ?? null }
      : null,
    prior: prior.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    warningCount: warning[0]?.value ?? 0,
  };
}
