import type { NotificationType, SystemNotificationType } from "@/lib/notifications/types";

export const NOTIFICATION_SETTINGS = [
  {
    type: "follow",
    label: "Follows",
    description: "Someone follows you.",
  },
  {
    type: "game_like",
    label: "Likes",
    description: "Someone likes your game.",
  },
  {
    type: "game_upvote",
    label: "Upvotes",
    description: "Someone upvotes your game.",
  },
  {
    type: "followee_publish",
    label: "New games",
    description: "A developer you follow publishes a game.",
  },
  {
    type: "followee_launch",
    label: "Launches",
    description: "A developer you follow launches a game.",
  },
] as const satisfies ReadonlyArray<{
  type: NotificationType;
  label: string;
  description: string;
}>;

type Listed = (typeof NOTIFICATION_SETTINGS)[number]["type"];
type PreferenceType = Exclude<NotificationType, SystemNotificationType>;
function assertAllTypes(
  settings: ReadonlyArray<{ type: Listed }> &
    (PreferenceType extends Listed ? unknown : never) &
    (Listed extends PreferenceType ? unknown : never),
) {
  return settings;
}
assertAllTypes(NOTIFICATION_SETTINGS);

export type NotificationPreferenceMap = Record<PreferenceType, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMap = {
  follow: true,
  game_like: true,
  game_upvote: true,
  followee_publish: true,
  followee_launch: true,
};

export function isNotificationType(value: string): value is PreferenceType {
  return NOTIFICATION_SETTINGS.some((item) => item.type === value);
}
