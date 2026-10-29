import { headers } from "next/headers";

import { DeveloperSettings } from "@/components/settings/developer-settings";
import { SettingsBlocked } from "@/components/settings/settings-blocked";
import { listActiveApiKeys } from "@/lib/api/keys";
import { publicOrigin } from "@/lib/api/origin";
import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsDeveloperPage() {
  const gate = await getSettingsGate();
  if (gate.status !== "ready") return null;
  if (gate.scheduled) return <SettingsBlocked />;

  const [headerList, keys] = await Promise.all([
    headers(),
    listActiveApiKeys(gate.profile.clerkUserId),
  ]);
  const origin = publicOrigin(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
    headerList.get("x-forwarded-proto"),
  );

  return <DeveloperSettings keys={keys} origin={origin} />;
}

export const metadata = { title: "Developer Settings", robots: { index: false, follow: false } };
