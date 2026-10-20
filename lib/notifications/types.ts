import type { NotificationPayload } from "@/db/schema";

export const SYSTEM_NOTIFICATION_TYPES = [
  "content_reported",
  "content_removed",
  "account_banned",
] as const;

export type SystemNotificationType = (typeof SYSTEM_NOTIFICATION_TYPES)[number];

export type NotificationType =
  | "follow"
  | "game_like"
  | "game_upvote"
  | "followee_publish"
  | "followee_launch"
  | SystemNotificationType;

export function isSystemNotificationType(type: NotificationType): type is SystemNotificationType {
  return (SYSTEM_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export type NotificationFilter =
  | "all"
  | "unread"
  | "read"
  | "today"
  | "yesterday"
  | "earlier";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actorClerkUserId: string;
  actorCount: number;
  entityType: string;
  entityId: string;
  payload: NotificationPayload;
  readAt: string | null;
  createdAt: string;
  href: string;
  message: string;
};

export type NotificationListResult = {
  items: NotificationItem[];
  nextCursor: string | null;
};
