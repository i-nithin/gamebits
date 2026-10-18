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

const GROUPS: Array<{ label: string; types: NotificationType[] }> = [
  {
    label: "Activity",
    types: ["game_like", "game_upvote", "followee_publish", "followee_launch"],
  },
  { label: "Community", types: ["follow"] },
];

const BY_TYPE = new Map(NOTIFICATION_SETTINGS.map((item) => [item.type, item]));

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
    <section className="flex min-h-full flex-1 flex-col rounded-xl border border-iron bg-obsidian px-5 py-5 sm:px-6">
      <h1 className="text-xl font-medium text-paper-white">Notification Preferences</h1>
      <p className="mt-1 text-sm text-fog">Manage which activity shows up in your notifications.</p>
      <div className="mt-6 flex flex-col gap-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-xs tracking-wide text-fog uppercase">{group.label}</p>
            <div className="overflow-hidden rounded-xl border border-iron">
              <div className="flex items-center gap-3 border-b border-iron px-4 py-3 text-sm text-fog">
                <span className="min-w-0 flex-1">Category</span>
                <span className="w-16 shrink-0 text-center">In app</span>
              </div>
              <ul>
                {group.types.map((type) => {
                  const item = BY_TYPE.get(type);
                  if (!item) return null;
                  const Icon = ICONS[item.type];
                  return (
                    <li
                      key={item.type}
                      className="flex items-center gap-3 border-b border-iron px-4 py-3 last:border-b-0"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-graphite text-fog">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-paper-white">{item.label}</span>
                        <span className="block text-sm text-fog">{item.description}</span>
                      </span>
                      <span className="flex w-16 shrink-0 justify-center">
                        <Switch
                          checked={values[item.type]}
                          aria-label={`${item.label}. ${item.description}`}
                          className="data-checked:bg-ice-strong data-checked:[&_[data-slot=switch-thumb]]:bg-white"
                          onCheckedChange={(enabled) => {
                            void toggle(item.type, enabled);
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="pt-4 text-sm text-error">{error}</p> : null}
    </section>
  );
}
