"use server";

import { and, eq } from "drizzle-orm";

import { gameReviews, games, reports } from "@/db/schema";
import { accountAccessError, getCurrentUserId } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { emitContentReported } from "@/lib/notifications/notices";
import { rateLimit } from "@/lib/rate-limit";
import {
  REPORT_DETAILS_MAX,
  detailsRequired,
  isGameReportReason,
  isReviewReportReason,
  type ReportTargetType,
} from "@/lib/reports";
import { isUuid, sanitizeMultiline } from "@/lib/sanitize";

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  if ("cause" in error) return isUniqueViolation((error as { cause: unknown }).cause);
  return false;
}

export async function createReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string;
}): Promise<{ ok: true } | { error: string }> {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { error: blocked ?? "Sign in to continue" };

  const targetType = input.targetType;
  const targetId = input.targetId;
  const reason = input.reason;
  if (targetType !== "review" && targetType !== "game") return { error: "Choose what to report." };
  if (!isUuid(targetId)) return { error: "That page is no longer available." };
  const reasonOk = targetType === "review" ? isReviewReportReason(reason) : isGameReportReason(reason);
  if (!reasonOk) return { error: "Choose a reason." };

  const details = sanitizeMultiline(input.details ?? "", REPORT_DETAILS_MAX);
  if (detailsRequired(targetType, reason) && !details) return { error: "Add a short description." };

  const limit = await rateLimit("report", userId);
  if (limit === "limited") return { error: "Too many reports. Try again in a few minutes." };
  if (limit === "unavailable") return { error: "Reports are unavailable right now." };

  const db = getDb();
  const target =
    targetType === "review" ? await loadReviewTarget(targetId) : await loadGameTarget(targetId);
  if (!target) return { error: targetType === "review" ? "Comment not found." : "Game not found." };
  if (target.subjectClerkUserId === userId) {
    return {
      error: targetType === "review" ? "You can't report your own comment." : "You can't report your own game.",
    };
  }

  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.reporterClerkUserId, userId),
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return { error: "You already reported this." };

  try {
    await db.insert(reports).values({
      reporterClerkUserId: userId,
      targetType,
      targetId,
      subjectClerkUserId: target.subjectClerkUserId,
      reason,
      details: details || null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "You already reported this." };
    throw error;
  }

  try {
    await emitContentReported({
      recipientId: target.subjectClerkUserId,
      targetType,
      targetId,
      gameName: target.gameName,
      gameSlug: target.gameSlug,
      reviewId: targetType === "review" ? targetId : undefined,
    });
  } catch (error) {
    console.error("[reports] warning notification failed", error);
  }

  return { ok: true };
}

async function loadReviewTarget(reviewId: string) {
  const [row] = await getDb()
    .select({
      subjectClerkUserId: gameReviews.clerkUserId,
      removedAt: gameReviews.removedAt,
      gameName: games.name,
      gameSlug: games.slug,
      archivedAt: games.archivedAt,
      takenDownAt: games.takenDownAt,
    })
    .from(gameReviews)
    .innerJoin(games, eq(games.id, gameReviews.gameId))
    .where(eq(gameReviews.id, reviewId))
    .limit(1);
  if (!row || row.removedAt || row.archivedAt || row.takenDownAt) return null;
  return {
    subjectClerkUserId: row.subjectClerkUserId,
    gameName: row.gameName,
    gameSlug: row.gameSlug,
  };
}

async function loadGameTarget(gameId: string) {
  const [row] = await getDb()
    .select({
      subjectClerkUserId: games.ownerClerkUserId,
      gameName: games.name,
      gameSlug: games.slug,
      archivedAt: games.archivedAt,
      takenDownAt: games.takenDownAt,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!row || row.archivedAt || row.takenDownAt) return null;
  return {
    subjectClerkUserId: row.subjectClerkUserId,
    gameName: row.gameName,
    gameSlug: row.gameSlug,
  };
}
