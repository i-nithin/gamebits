import type { NotificationPayload } from "@/db/schema";
import { emitDirectNotification } from "@/lib/notifications/emit";
import { SYSTEM_ACTOR_ID } from "@/lib/reports";

function systemPayload(
  extra: Pick<NotificationPayload, "gameName" | "gameSlug" | "reviewId" | "subjectKind">,
): NotificationPayload {
  return {
    actorName: "GameBits",
    actorHandle: "",
    actorImageUrl: null,
    ...extra,
  };
}

export async function emitContentReported(opts: {
  recipientId: string | null;
  targetType: "review" | "game";
  targetId: string;
  gameName: string;
  gameSlug: string;
  reviewId?: string;
}) {
  if (!opts.recipientId) return;
  await emitDirectNotification({
    recipientId: opts.recipientId,
    actorId: SYSTEM_ACTOR_ID,
    type: "content_reported",
    entityType: opts.targetType,
    entityId: opts.targetId,
    groupKey: `report:${opts.targetType}:${opts.targetId}`,
    aggregate: true,
    countEach: true,
    payload: systemPayload({
      gameName: opts.gameName,
      gameSlug: opts.gameSlug,
      reviewId: opts.reviewId,
      subjectKind: opts.targetType,
    }),
  });
}

export async function emitContentRemoved(opts: {
  recipientId: string | null;
  targetType: "review" | "game";
  targetId: string;
  gameName: string;
  gameSlug: string;
  reviewId?: string;
}) {
  if (!opts.recipientId) return;
  await emitDirectNotification({
    recipientId: opts.recipientId,
    actorId: SYSTEM_ACTOR_ID,
    type: "content_removed",
    entityType: opts.targetType,
    entityId: opts.targetId,
    groupKey: `removed:${opts.targetType}:${opts.targetId}:${Date.now()}`,
    payload: systemPayload({
      gameName: opts.gameName,
      gameSlug: opts.gameSlug,
      reviewId: opts.reviewId,
      subjectKind: opts.targetType,
    }),
  });
}

export async function emitAccountBanned(recipientId: string) {
  await emitDirectNotification({
    recipientId,
    actorId: SYSTEM_ACTOR_ID,
    type: "account_banned",
    entityType: "profile",
    entityId: recipientId,
    groupKey: `banned:${recipientId}:${Date.now()}`,
    payload: systemPayload({}),
  });
}
