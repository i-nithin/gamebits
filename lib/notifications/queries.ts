import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { notifications, notificationState, profiles } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import { DELETED_PROFILE_NAME } from "@/lib/profile";
import {
  formatNotificationMessage,
  notificationHref,
} from "@/lib/notifications/format";
import type {
  NotificationFilter,
  NotificationItem,
  NotificationListResult,
  NotificationType,
} from "@/lib/notifications/types";

function startOfUtcDay(daysAgo = 0) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function toItem(row: {
  id: string;
  type: NotificationType;
  actorClerkUserId: string;
  actorCount: number;
  entityType: string;
  entityId: string;
  payload: NotificationItem["payload"];
  readAt: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    actorClerkUserId: row.actorClerkUserId,
    actorCount: row.actorCount,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    href: notificationHref(row.type, row.payload, row.entityId),
    message: formatNotificationMessage(row.type, row.payload, row.actorCount),
  };
}

async function maskDeletedActors(items: NotificationItem[]): Promise<NotificationItem[]> {
  if (!hasDatabase() || items.length === 0) return items;
  const ids = [...new Set(items.map((item) => item.actorClerkUserId))];
  const db = getDb();
  const rows = await db
    .select({ clerkUserId: profiles.clerkUserId })
    .from(profiles)
    .where(and(inArray(profiles.clerkUserId, ids), isNotNull(profiles.deletedAt)));
  if (rows.length === 0) return items;
  const deleted = new Set(rows.map((row) => row.clerkUserId));
  return items.map((item) => {
    if (!deleted.has(item.actorClerkUserId)) return item;
    const payload = {
      ...item.payload,
      actorName: DELETED_PROFILE_NAME,
      actorHandle: "",
      actorImageUrl: null,
    };
    return {
      ...item,
      payload,
      href: notificationHref(item.type, payload, item.entityId),
      message: formatNotificationMessage(item.type, payload, item.actorCount),
    };
  });
}

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split("|");
  if (!createdAt || !id) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return { createdAt: date, id };
}

function encodeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

function filterConditions(filter: NotificationFilter) {
  const today = startOfUtcDay(0);
  const yesterday = startOfUtcDay(1);

  switch (filter) {
    case "unread":
      return [isNull(notifications.readAt)];
    case "read":
      return [isNotNull(notifications.readAt)];
    case "today":
      return [gte(notifications.createdAt, today)];
    case "yesterday":
      return [gte(notifications.createdAt, yesterday), lt(notifications.createdAt, today)];
    case "earlier":
      return [lt(notifications.createdAt, yesterday)];
    case "all":
    default:
      return [];
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const db = getDb();
    const [row] = await db
      .select({ unreadCount: notificationState.unreadCount })
      .from(notificationState)
      .where(eq(notificationState.clerkUserId, userId))
      .limit(1);
    return row?.unreadCount ?? 0;
  } catch (error) {
    console.error("[notifications] getUnreadCount failed", error);
    return 0;
  }
}

export async function listLatestUnread(
  userId: string,
  limit = 5,
): Promise<NotificationItem[]> {
  if (!hasDatabase()) return [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        actorClerkUserId: notifications.actorClerkUserId,
        actorCount: notifications.actorCount,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(eq(notifications.recipientClerkUserId, userId), isNull(notifications.readAt)),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit);

    return maskDeletedActors(rows.map((row) => toItem({ ...row, type: row.type as NotificationType })));
  } catch (error) {
    console.error("[notifications] listLatestUnread failed", error);
    return [];
  }
}

export async function listNotifications(opts: {
  userId: string;
  filter: NotificationFilter;
  limit?: number;
  cursor?: string | null;
}): Promise<NotificationListResult> {
  if (!hasDatabase()) return { items: [], nextCursor: null };
  try {
    const db = getDb();
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const cursor = decodeCursor(opts.cursor);

    const conditions = [
      eq(notifications.recipientClerkUserId, opts.userId),
      ...filterConditions(opts.filter),
    ];

    if (cursor) {
      conditions.push(
        sql`(${notifications.createdAt}, ${notifications.id}) < (${cursor.createdAt}, ${cursor.id}::uuid)`,
      );
    }

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        actorClerkUserId: notifications.actorClerkUserId,
        actorCount: notifications.actorCount,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const items = await maskDeletedActors(
      page.map((row) => toItem({ ...row, type: row.type as NotificationType })),
    );
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;

    return { items, nextCursor };
  } catch (error) {
    console.error("[notifications] listNotifications failed", error);
    return { items: [], nextCursor: null };
  }
}

export async function markNotificationsRead(opts: {
  userId: string;
  ids?: string[];
  all?: boolean;
}): Promise<{ marked: number; unreadCount: number }> {
  if (!hasDatabase()) return { marked: 0, unreadCount: 0 };
  try {
    const db = getDb();
    const now = new Date();

    let markedIds: string[] = [];

    if (opts.all) {
      const updated = await db
        .update(notifications)
        .set({ readAt: now, updatedAt: now })
        .where(
          and(
            eq(notifications.recipientClerkUserId, opts.userId),
            isNull(notifications.readAt),
          ),
        )
        .returning({ id: notifications.id });
      markedIds = updated.map((row) => row.id);
    } else if (opts.ids && opts.ids.length > 0) {
      const updated = await db
        .update(notifications)
        .set({ readAt: now, updatedAt: now })
        .where(
          and(
            eq(notifications.recipientClerkUserId, opts.userId),
            inArray(notifications.id, opts.ids),
            isNull(notifications.readAt),
          ),
        )
        .returning({ id: notifications.id });
      markedIds = updated.map((row) => row.id);
    }

    if (markedIds.length > 0) {
      await db
        .insert(notificationState)
        .values({ clerkUserId: opts.userId, unreadCount: 0 })
        .onConflictDoUpdate({
          target: notificationState.clerkUserId,
          set: {
            unreadCount: sql`GREATEST(0, ${notificationState.unreadCount} - ${markedIds.length})`,
            updatedAt: now,
          },
        });
    }

    const unreadCount = await getUnreadCount(opts.userId);
    return { marked: markedIds.length, unreadCount };
  } catch (error) {
    console.error("[notifications] markNotificationsRead failed", error);
    return { marked: 0, unreadCount: 0 };
  }
}

export async function markNotificationsUnread(opts: {
  userId: string;
  ids: string[];
}): Promise<{ marked: number; unreadCount: number }> {
  if (!hasDatabase() || opts.ids.length === 0) {
    return { marked: 0, unreadCount: await getUnreadCount(opts.userId) };
  }
  try {
    const db = getDb();
    const now = new Date();

    const rows = await db
      .select({
        id: notifications.id,
        groupKey: notifications.groupKey,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientClerkUserId, opts.userId),
          inArray(notifications.id, opts.ids),
        ),
      );

    let marked = 0;
    for (const row of rows) {
      if (!row.readAt) continue;

      const [existingUnread] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientClerkUserId, opts.userId),
            eq(notifications.groupKey, row.groupKey),
            isNull(notifications.readAt),
          ),
        )
        .limit(1);

      if (existingUnread) continue;

      const updated = await db
        .update(notifications)
        .set({ readAt: null, updatedAt: now })
        .where(
          and(
            eq(notifications.id, row.id),
            eq(notifications.recipientClerkUserId, opts.userId),
            isNotNull(notifications.readAt),
          ),
        )
        .returning({ id: notifications.id });

      if (updated[0]) marked += 1;
    }

    if (marked > 0) {
      await db
        .insert(notificationState)
        .values({ clerkUserId: opts.userId, unreadCount: marked })
        .onConflictDoUpdate({
          target: notificationState.clerkUserId,
          set: {
            unreadCount: sql`${notificationState.unreadCount} + ${marked}`,
            updatedAt: now,
          },
        });
    }

    const unreadCount = await getUnreadCount(opts.userId);
    return { marked, unreadCount };
  } catch (error) {
    console.error("[notifications] markNotificationsUnread failed", error);
    return { marked: 0, unreadCount: await getUnreadCount(opts.userId) };
  }
}

export async function ensureActorPayload(actorId: string) {
  if (!hasDatabase()) {
    return {
      actorName: "Someone",
      actorHandle: "",
      actorImageUrl: null as string | null,
    };
  }
  const db = getDb();
  const [actor] = await db
    .select({
      name: profiles.name,
      handle: profiles.handle,
      imageUrl: profiles.imageUrl,
      deletedAt: profiles.deletedAt,
    })
    .from(profiles)
    .where(eq(profiles.clerkUserId, actorId))
    .limit(1);

  if (actor?.deletedAt) {
    return {
      actorName: DELETED_PROFILE_NAME,
      actorHandle: "",
      actorImageUrl: null,
    };
  }

  return {
    actorName: actor?.name ?? "Someone",
    actorHandle: actor?.handle ?? "",
    actorImageUrl: actor?.imageUrl ?? null,
  };
}
