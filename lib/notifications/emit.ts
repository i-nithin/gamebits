import { and, eq, gt, sql } from "drizzle-orm";
import { after } from "next/server";

import {
  follows,
  notificationJobs,
  notifications,
  notificationState,
  type NotificationPayload,
} from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import type { NotificationType } from "@/lib/notifications/types";

const FANOUT_BATCH = 250;

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  if ("cause" in error) return isUniqueViolation((error as { cause: unknown }).cause);
  return false;
}

async function bumpUnread(db: ReturnType<typeof getDb>, recipientIds: string[]) {
  if (recipientIds.length === 0) return;
  const unique = [...new Set(recipientIds)];
  await db
    .insert(notificationState)
    .values(unique.map((id) => ({ clerkUserId: id, unreadCount: 1 })))
    .onConflictDoUpdate({
      target: notificationState.clerkUserId,
      set: {
        unreadCount: sql`${notificationState.unreadCount} + 1`,
        updatedAt: new Date(),
      },
    });
}

async function bumpUnreadOne(db: ReturnType<typeof getDb>, recipientId: string) {
  await db
    .insert(notificationState)
    .values({ clerkUserId: recipientId, unreadCount: 1 })
    .onConflictDoUpdate({
      target: notificationState.clerkUserId,
      set: {
        unreadCount: sql`${notificationState.unreadCount} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function emitDirectNotification(opts: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  groupKey: string;
  payload: NotificationPayload;
  aggregate?: boolean;
}) {
  if (!hasDatabase()) return;
  if (opts.recipientId === opts.actorId) return;

  const db = getDb();
  const now = new Date();

  if (opts.aggregate) {
    const [existing] = await db
      .select({
        id: notifications.id,
        actorClerkUserId: notifications.actorClerkUserId,
        actorCount: notifications.actorCount,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientClerkUserId, opts.recipientId),
          eq(notifications.groupKey, opts.groupKey),
          sql`${notifications.readAt} is null`,
        ),
      )
      .limit(1);

    if (existing) {
      const sameActor = existing.actorClerkUserId === opts.actorId;
      await db
        .update(notifications)
        .set({
          actorClerkUserId: opts.actorId,
          actorCount: sameActor ? existing.actorCount : existing.actorCount + 1,
          payload: opts.payload,
          updatedAt: now,
        })
        .where(eq(notifications.id, existing.id));
      return;
    }
  }

  try {
    await db.insert(notifications).values({
      recipientClerkUserId: opts.recipientId,
      type: opts.type,
      actorClerkUserId: opts.actorId,
      actorCount: 1,
      entityType: opts.entityType,
      entityId: opts.entityId,
      groupKey: opts.groupKey,
      payload: opts.payload,
      createdAt: now,
      updatedAt: now,
    });
    await bumpUnreadOne(db, opts.recipientId);
  } catch (error) {
    if (!opts.aggregate || !isUniqueViolation(error)) throw error;
    const [existing] = await db
      .select({
        id: notifications.id,
        actorClerkUserId: notifications.actorClerkUserId,
        actorCount: notifications.actorCount,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientClerkUserId, opts.recipientId),
          eq(notifications.groupKey, opts.groupKey),
          sql`${notifications.readAt} is null`,
        ),
      )
      .limit(1);
    if (!existing) throw error;
    const sameActor = existing.actorClerkUserId === opts.actorId;
    await db
      .update(notifications)
      .set({
        actorClerkUserId: opts.actorId,
        actorCount: sameActor ? existing.actorCount : existing.actorCount + 1,
        payload: opts.payload,
        updatedAt: now,
      })
      .where(eq(notifications.id, existing.id));
  }
}

export async function enqueueFollowerFanout(opts: {
  type: "followee_publish" | "followee_launch";
  actorId: string;
  entityId: string;
  groupKey: string;
  payload: NotificationPayload;
}) {
  if (!hasDatabase()) return;
  const db = getDb();
  const [job] = await db
    .insert(notificationJobs)
    .values({
      type: opts.type,
      actorClerkUserId: opts.actorId,
      // groupKey encoded as entityId prefix when needed; store real game id in payload
      entityId: opts.groupKey,
      payload: { ...opts.payload, gameId: opts.entityId },
      status: "pending",
    })
    .returning({ id: notificationJobs.id });

  if (!job) return;
  after(async () => {
    try {
      await processNotificationJob(job.id);
    } catch (error) {
      console.error("[notifications] fan-out failed", job.id, error);
      try {
        await getDb()
          .update(notificationJobs)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(notificationJobs.id, job.id));
      } catch {
        // ignore secondary failure
      }
    }
  });
}

export async function processNotificationJob(jobId: string) {
  if (!hasDatabase()) return;
  const db = getDb();

  for (;;) {
    const [job] = await db
      .select()
      .from(notificationJobs)
      .where(and(eq(notificationJobs.id, jobId), eq(notificationJobs.status, "pending")))
      .limit(1);
    if (!job) return;

    const followerQuery = db
      .select({ followerId: follows.followerClerkUserId })
      .from(follows)
      .where(
        job.cursor
          ? and(
              eq(follows.followingClerkUserId, job.actorClerkUserId),
              gt(follows.followerClerkUserId, job.cursor),
            )
          : eq(follows.followingClerkUserId, job.actorClerkUserId),
      )
      .orderBy(follows.followerClerkUserId)
      .limit(FANOUT_BATCH);

    const followers = await followerQuery;
    if (followers.length === 0) {
      await db
        .update(notificationJobs)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(notificationJobs.id, jobId));
      return;
    }

    const now = new Date();
    const groupKey = job.entityId;
    const gameEntityId = job.payload.gameId ?? job.entityId;
    const rows = followers.map((row) => ({
      recipientClerkUserId: row.followerId,
      type: job.type as NotificationType,
      actorClerkUserId: job.actorClerkUserId,
      actorCount: 1,
      entityType: "game",
      entityId: gameEntityId,
      groupKey,
      payload: job.payload,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(notifications).values(rows);
    await bumpUnread(
      db,
      followers.map((row) => row.followerId),
    );

    const lastCursor = followers[followers.length - 1]?.followerId ?? null;
    if (followers.length < FANOUT_BATCH) {
      await db
        .update(notificationJobs)
        .set({ status: "done", cursor: lastCursor, updatedAt: new Date() })
        .where(eq(notificationJobs.id, jobId));
      return;
    }

    await db
      .update(notificationJobs)
      .set({ cursor: lastCursor, updatedAt: new Date() })
      .where(eq(notificationJobs.id, jobId));
  }
}
