import type { NotificationType } from "@/lib/notifications/types";

export const NOTIFICATION_SETTINGS = [
  { type: "follow", label: "Someone follows you" },
  { type: "game_like", label: "Someone likes your game" },
  { type: "game_upvote", label: "Someone upvotes your game" },
  { type: "followee_publish", label: "A developer you follow publishes a game" },
  { type: "followee_launch", label: "A developer you follow launches a game" },
] as const satisfies ReadonlyArray<{ type: NotificationType; label: string }>;

type Listed = (typeof NOTIFICATION_SETTINGS)[number]["type"];
function assertAllTypes(
  settings: ReadonlyArray<{ type: Listed }> &
    (NotificationType extends Listed ? unknown : never),
) {
  return settings;
}
assertAllTypes(NOTIFICATION_SETTINGS);

export type NotificationPreferenceMap = Record<NotificationType, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMap = {
  follow: true,
  game_like: true,
  game_upvote: true,
  followee_publish: true,
  followee_launch: true,
};

export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_SETTINGS.some((item) => item.type === value);
}
