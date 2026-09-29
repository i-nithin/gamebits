import { eq } from "drizzle-orm";

import { notificationPreferences } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceMap,
} from "@/lib/notifications/catalog";
import type { NotificationType } from "@/lib/notifications/types";

export function notificationPreferenceColumn(type: NotificationType) {
  switch (type) {
    case "follow":
      return notificationPreferences.follow;
    case "game_like":
      return notificationPreferences.gameLike;
    case "game_upvote":
      return notificationPreferences.gameUpvote;
    case "followee_publish":
      return notificationPreferences.followeePublish;
    case "followee_launch":
      return notificationPreferences.followeeLaunch;
  }
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferenceMap> {
  if (!hasDatabase()) return DEFAULT_NOTIFICATION_PREFERENCES;
  const [row] = await getDb()
    .select({
      follow: notificationPreferences.follow,
      gameLike: notificationPreferences.gameLike,
      gameUpvote: notificationPreferences.gameUpvote,
      followeePublish: notificationPreferences.followeePublish,
      followeeLaunch: notificationPreferences.followeeLaunch,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.clerkUserId, userId))
    .limit(1);
  if (!row) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    follow: row.follow,
    game_like: row.gameLike,
    game_upvote: row.gameUpvote,
    followee_publish: row.followeePublish,
    followee_launch: row.followeeLaunch,
  };
}

export async function isNotificationEnabled(userId: string, type: NotificationType) {
  if (!hasDatabase()) return true;
  const [row] = await getDb()
    .select({ enabled: notificationPreferenceColumn(type) })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.clerkUserId, userId))
    .limit(1);
  if (!row) return true;
  return row.enabled;
}

function preferencePatch(type: NotificationType, enabled: boolean) {
  switch (type) {
    case "follow":
      return { follow: enabled };
    case "game_like":
      return { gameLike: enabled };
    case "game_upvote":
      return { gameUpvote: enabled };
    case "followee_publish":
      return { followeePublish: enabled };
    case "followee_launch":
      return { followeeLaunch: enabled };
  }
}

export async function setNotificationPreference(
  userId: string,
  type: NotificationType,
  enabled: boolean,
) {
  if (!hasDatabase()) return;
  const patch = preferencePatch(type, enabled);
  await getDb()
    .insert(notificationPreferences)
    .values({ clerkUserId: userId, ...patch })
    .onConflictDoUpdate({
      target: notificationPreferences.clerkUserId,
      set: { ...patch, updatedAt: new Date() },
    });
}
