import type { NotificationPayload } from "@/db/schema";

export type NotificationType =
  | "follow"
  | "game_like"
  | "game_upvote"
  | "followee_publish"
  | "followee_launch";

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
