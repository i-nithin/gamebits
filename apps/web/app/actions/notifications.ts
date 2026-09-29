"use server";

import { getCurrentUserId } from "@/lib/auth-admin";
import {
  getUnreadCount,
  listLatestUnread,
  listNotifications,
  markNotificationsRead,
  markNotificationsUnread,
} from "@/lib/notifications";
import type { NotificationFilter } from "@/lib/notifications/types";

export async function getNotificationUnreadCountAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, reason: "unauthenticated" as const };
  const unreadCount = await getUnreadCount(userId);
  return { ok: true as const, unreadCount };
}

export async function listLatestUnreadNotificationsAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, reason: "unauthenticated" as const };
  const items = await listLatestUnread(userId, 5);
  return { ok: true as const, items };
}

export async function listNotificationsAction(opts: {
  filter: NotificationFilter;
  cursor?: string | null;
  limit?: number;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, reason: "unauthenticated" as const };
  const result = await listNotifications({
    userId,
    filter: opts.filter,
    cursor: opts.cursor,
    limit: opts.limit,
  });
  return { ok: true as const, ...result };
}

export async function markNotificationsReadAction(opts: {
  ids?: string[];
  all?: boolean;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, reason: "unauthenticated" as const };
  const result = await markNotificationsRead({
    userId,
    ids: opts.ids,
    all: opts.all,
  });
  return { ok: true as const, ...result };
}

export async function markNotificationsUnreadAction(opts: { ids: string[] }) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, reason: "unauthenticated" as const };
  const result = await markNotificationsUnread({
    userId,
    ids: opts.ids,
  });
  return { ok: true as const, ...result };
}
