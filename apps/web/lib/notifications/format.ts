import type { NotificationPayload } from "@/db/schema";
import type { NotificationType } from "@/lib/notifications/types";

function actorLabel(payload: NotificationPayload) {
  return payload.actorHandle ? `@${payload.actorHandle}` : payload.actorName;
}

function othersLabel(actorCount: number) {
  const others = actorCount - 1;
  if (others <= 0) return null;
  return others === 1 ? "1 other" : `${others} others`;
}

export function formatNotificationMessage(
  type: NotificationType,
  payload: NotificationPayload,
  actorCount: number,
): string {
  const actor = actorLabel(payload);
  const others = othersLabel(actorCount);
  const game = payload.gameName ?? "a game";

  switch (type) {
    case "follow":
      return `${actor} followed you`;
    case "game_like":
      return others
        ? `${actor} and ${others} liked ${game}`
        : `${actor} liked ${game}`;
    case "game_upvote":
      return others
        ? `${actor} and ${others} upvoted ${game}`
        : `${actor} upvoted ${game}`;
    case "followee_publish":
      return `${actor} published ${game}`;
    case "followee_launch":
      return `${actor} launched ${game}`;
    default:
      return "New notification";
  }
}

export function notificationHref(
  type: NotificationType,
  payload: NotificationPayload,
  entityId: string,
): string {
  switch (type) {
    case "follow":
      return payload.actorHandle ? `/u/${payload.actorHandle}` : "/";
    case "game_like":
    case "followee_publish":
      return payload.gameSlug ? `/games/${payload.gameSlug}` : "/";
    case "game_upvote":
    case "followee_launch":
      if (payload.isoYear && payload.isoWeek) {
        return `/week/${payload.isoYear}/${payload.isoWeek}`;
      }
      return payload.gameSlug ? `/games/${payload.gameSlug}` : "/";
    default:
      return entityId ? `/games/${entityId}` : "/";
  }
}

export function formatRelativeTime(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
