"use client";

import {
  ArrowBigUpIcon,
  Gamepad2Icon,
  HeartIcon,
  RocketIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { updateNotificationPreferenceAction } from "@/app/actions/settings";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_SETTINGS } from "@/lib/notifications/catalog";
import type { NotificationPreferenceMap } from "@/lib/notifications/catalog";
import type { NotificationType } from "@/lib/notifications/types";

const ICONS: Record<NotificationType, LucideIcon> = {
  follow: UserPlusIcon,
  game_like: HeartIcon,
  game_upvote: ArrowBigUpIcon,
  followee_publish: Gamepad2Icon,
  followee_launch: RocketIcon,
};

export function NotificationSettings({
  preferences,
}: {
  preferences: NotificationPreferenceMap;
}) {
  const [values, setValues] = useState(preferences);
  const [error, setError] = useState<string | null>(null);

  async function toggle(type: NotificationType, enabled: boolean) {
    const previous = values[type];
    setValues((current) => ({ ...current, [type]: enabled }));
    setError(null);
    const result = await updateNotificationPreferenceAction(type, enabled);
    if (!result.ok) {
      setValues((current) => ({ ...current, [type]: previous }));
      setError(result.error);
    }
  }

  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-iron bg-obsidian px-4 py-4 sm:px-5">
      <div className="pb-2">
        <h2 className="text-lg font-medium text-paper-white">Notifications</h2>
        <p className="mt-1 text-sm text-fog">
          Turn a type off and GameBits will not add that activity to your notifications.
        </p>
      </div>
      <ul>
        {NOTIFICATION_SETTINGS.map((item) => {
          const Icon = ICONS[item.type];
          return (
            <li
              key={item.type}
              className="flex items-center gap-3 border-t border-iron py-3"
            >
              <Icon className="size-4 shrink-0 text-fog" />
              <span className="min-w-0 flex-1 text-sm text-paper-white">{item.label}</span>
              <Switch
                checked={values[item.type]}
                aria-label={item.label}
                onCheckedChange={(enabled) => {
                  void toggle(item.type, enabled);
                }}
              />
            </li>
          );
        })}
      </ul>
      {error ? <p className="pt-2 text-sm text-error">{error}</p> : null}
    </section>
  );
}
