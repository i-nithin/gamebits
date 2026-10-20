"use server";

import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { gameReviews, games, profiles, reports } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import { revokeUserSessions } from "@/lib/account-purge";
import { getDb } from "@/lib/db";
import { emitAccountBanned, emitContentRemoved } from "@/lib/notifications/notices";
import { reportReasonLabel } from "@/lib/reports";
import { isUuid, sanitizePlainText } from "@/lib/sanitize";

const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/;

function revalidateGame(slug: string) {
  revalidatePath(`/games/${slug}`);
  revalidatePath(`/games/${slug}/edit`);
  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/4dm1n");
  revalidatePath("/4dm1n/reports");
}

function sqlWhere(where: SQL | undefined) {
  if (!where) throw new Error("Invalid report");
  return where;
}

async function resolveOpenReports(
  tx: Pick<ReturnType<typeof getDb>, "update">,
  where: SQL,
  resolution: string,
  adminId: string,
) {
  await tx
    .update(reports)
    .set({
      status: "actioned",
      resolution,
      resolvedByClerkUserId: adminId,
      resolvedAt: new Date(),
    })
    .where(where);
}

export async function dismissReportAction(formData: FormData) {
  const adminId = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  if (!isUuid(reportId)) throw new Error("Report not found");

  const db = getDb();
  const [report] = await db
    .select({ id: reports.id, status: reports.status })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report) throw new Error("Report not found");
  if (report.status !== "open") throw new Error("This report is already closed");

  await db
    .update(reports)
    .set({
      status: "dismissed",
      resolution: "dismissed",
      resolvedByClerkUserId: adminId,
      resolvedAt: new Date(),
    })
    .where(and(eq(reports.id, reportId), eq(reports.status, "open")));

  revalidatePath("/4dm1n/reports");
  revalidatePath(`/4dm1n/reports/${reportId}`);
}

export async function removeReportedCommentAction(formData: FormData) {
  const adminId = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  if (!isUuid(reportId)) throw new Error("Report not found");

  const removed = await getDb().transaction(async (tx) => {
    const [report] = await tx
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!report || report.targetType !== "review") throw new Error("Comment not found");

    const [review] = await tx
      .select({
        id: gameReviews.id,
        removedAt: gameReviews.removedAt,
        removedByBan: gameReviews.removedByBan,
        clerkUserId: gameReviews.clerkUserId,
        gameName: games.name,
        gameSlug: games.slug,
      })
      .from(gameReviews)
      .innerJoin(games, eq(games.id, gameReviews.gameId))
      .where(eq(gameReviews.id, report.targetId))
      .limit(1);
    if (!review) throw new Error("Comment not found");
    if (review.removedAt && !review.removedByBan) throw new Error("This comment is already removed");

    const now = new Date();
    await tx
      .update(gameReviews)
      .set({ removedAt: review.removedAt ?? now, removedByBan: false, updatedAt: now })
      .where(eq(gameReviews.id, review.id));
    await resolveOpenReports(
      tx,
      sqlWhere(
        and(eq(reports.status, "open"), eq(reports.targetType, "review"), eq(reports.targetId, review.id)),
      ),
      "comment_removed",
      adminId,
    );
    return review;
  });

  try {
    await emitContentRemoved({
      recipientId: removed.clerkUserId,
      targetType: "review",
      targetId: removed.id,
      gameName: removed.gameName,
      gameSlug: removed.gameSlug,
      reviewId: removed.id,
    });
  } catch (error) {
    console.error("[reports] removal notification failed", error);
  }

  revalidateGame(removed.gameSlug);
  revalidatePath(`/4dm1n/reports/${reportId}`);
}

export async function takeDownReportedGameAction(formData: FormData) {
  const adminId = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  if (!isUuid(reportId)) throw new Error("Report not found");

  const takenDown = await getDb().transaction(async (tx) => {
    const [report] = await tx
      .select({ targetType: reports.targetType, targetId: reports.targetId })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!report || report.targetType !== "game") throw new Error("Game not found");

    const [game] = await tx
      .select({
        id: games.id,
        slug: games.slug,
        name: games.name,
        ownerClerkUserId: games.ownerClerkUserId,
        archivedAt: games.archivedAt,
        takenDownAt: games.takenDownAt,
        hiddenByBan: games.hiddenByBan,
        moderationArchive: games.moderationArchive,
      })
      .from(games)
      .where(eq(games.id, report.targetId))
      .limit(1);
    if (!game) throw new Error("Game not found");
    if (game.takenDownAt && !game.hiddenByBan) throw new Error("This game is already taken down");

    const now = new Date();
    const live = !game.archivedAt;
    await tx
      .update(games)
      .set({
        takenDownAt: game.takenDownAt ?? now,
        hiddenByBan: false,
        archivedAt: game.archivedAt ?? now,
        moderationArchive: game.hiddenByBan ? game.moderationArchive : live || game.moderationArchive,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));
    await resolveOpenReports(
      tx,
      sqlWhere(and(eq(reports.status, "open"), eq(reports.targetType, "game"), eq(reports.targetId, game.id))),
      "game_taken_down",
      adminId,
    );
    return game;
  });

  try {
    await emitContentRemoved({
      recipientId: takenDown.ownerClerkUserId,
      targetType: "game",
      targetId: takenDown.id,
      gameName: takenDown.name,
      gameSlug: takenDown.slug,
    });
  } catch (error) {
    console.error("[reports] takedown notification failed", error);
  }

  revalidateGame(takenDown.slug);
  revalidatePath(`/4dm1n/reports/${reportId}`);
}

export async function banFromReportAction(formData: FormData) {
  const adminId = await requireAdmin();
  const reportId = String(formData.get("reportId") ?? "");
  if (!isUuid(reportId)) throw new Error("Report not found");

  const db = getDb();
  const [report] = await db
    .select({
      subjectClerkUserId: reports.subjectClerkUserId,
      reason: reports.reason,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report?.subjectClerkUserId) throw new Error("This report has no account to ban");

  const note =
    sanitizePlainText(String(formData.get("reason") ?? ""), 500) || reportReasonLabel(report.reason);
  const banned = await banUser(adminId, report.subjectClerkUserId, note);
  revalidatePath(`/4dm1n/reports/${reportId}`);
  for (const slug of banned.slugs) revalidateGame(slug);
  redirect(`/4dm1n/reports/${reportId}`);
}

export async function unbanUserAction(formData: FormData) {
  await requireAdmin();
  const clerkUserId = String(formData.get("clerkUserId") ?? "");
  if (!CLERK_USER_ID.test(clerkUserId)) throw new Error("Invalid user");

  const restored = await getDb().transaction(async (tx) => {
    const [profile] = await tx
      .select({ bannedAt: profiles.bannedAt })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);
    if (!profile?.bannedAt) throw new Error("This account is not banned");

    const now = new Date();
    const hiddenGames = await tx
      .select({ id: games.id, slug: games.slug, moderationArchive: games.moderationArchive })
      .from(games)
      .where(and(eq(games.ownerClerkUserId, clerkUserId), eq(games.hiddenByBan, true)));

    for (const game of hiddenGames) {
      await tx
        .update(games)
        .set({
          takenDownAt: null,
          hiddenByBan: false,
          moderationArchive: false,
          ...(game.moderationArchive ? { archivedAt: null } : {}),
          updatedAt: now,
        })
        .where(eq(games.id, game.id));
    }

    await tx
      .update(gameReviews)
      .set({ removedAt: null, removedByBan: false, updatedAt: now })
      .where(and(eq(gameReviews.clerkUserId, clerkUserId), eq(gameReviews.removedByBan, true)));

    await tx
      .update(profiles)
      .set({ bannedAt: null, banReason: null, updatedAt: now })
      .where(eq(profiles.clerkUserId, clerkUserId));

    return hiddenGames.map((game) => game.slug);
  });

  revalidatePath("/4dm1n");
  revalidatePath("/4dm1n/reports");
  revalidatePath("/", "layout");
  for (const slug of restored) revalidateGame(slug);
}

async function banUser(adminId: string, clerkUserId: string, reason: string) {
  if (clerkUserId === adminId) throw new Error("You can't ban yourself");

  const banned = await getDb().transaction(async (tx) => {
    const [profile] = await tx
      .select({
        clerkUserId: profiles.clerkUserId,
        superAdmin: profiles.superAdmin,
        bannedAt: profiles.bannedAt,
      })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);
    if (!profile) throw new Error("User not found");
    if (profile.superAdmin) throw new Error("Remove admin access before banning this account");

    const now = new Date();
    const owned = await tx
      .select({ slug: games.slug })
      .from(games)
      .where(eq(games.ownerClerkUserId, clerkUserId));

    await tx
      .update(games)
      .set({
        moderationArchive: sqlCaseArchive(),
        archivedAt: sql`coalesce(${games.archivedAt}, ${now})`,
        takenDownAt: sql`coalesce(${games.takenDownAt}, ${now})`,
        hiddenByBan: sql`case when ${games.takenDownAt} is null then true else ${games.hiddenByBan} end`,
        updatedAt: now,
      })
      .where(eq(games.ownerClerkUserId, clerkUserId));

    await tx
      .update(gameReviews)
      .set({ removedAt: now, removedByBan: true, updatedAt: now })
      .where(and(eq(gameReviews.clerkUserId, clerkUserId), isNull(gameReviews.removedAt)));

    await tx
      .update(profiles)
      .set({ bannedAt: profile.bannedAt ?? now, banReason: reason, updatedAt: now })
      .where(eq(profiles.clerkUserId, clerkUserId));

    await resolveOpenReports(
      tx,
      sqlWhere(and(eq(reports.status, "open"), eq(reports.subjectClerkUserId, clerkUserId))),
      "user_banned",
      adminId,
    );

    return { slugs: owned.map((game) => game.slug) };
  });

  try {
    await emitAccountBanned(clerkUserId);
  } catch (error) {
    console.error("[reports] ban notification failed", error);
  }
  try {
    await revokeUserSessions(clerkUserId);
  } catch (error) {
    console.error("[reports] session revoke failed", error);
  }
  revalidatePath("/4dm1n");
  revalidatePath("/", "layout");
  return banned;
}

function sqlCaseArchive() {
  return sql`case when ${games.archivedAt} is null then true else ${games.moderationArchive} end`;
}
