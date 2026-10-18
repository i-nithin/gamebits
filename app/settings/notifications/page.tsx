import { NotificationSettings } from "@/components/settings/notification-settings";
import { SettingsBlocked } from "@/components/settings/settings-blocked";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsNotificationsPage() {
  const gate = await getSettingsGate();
  if (gate.status !== "ready") return null;
  if (gate.scheduled) return <SettingsBlocked />;

  const preferences = await getNotificationPreferences(gate.profile.clerkUserId);
  return <NotificationSettings preferences={preferences} />;
}
