import { SettingsSoon } from "@/components/settings/settings-soon";
import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsBillingPage() {
  const gate = await getSettingsGate();
  if (gate.status !== "ready") return null;
  return <SettingsSoon title="Billing" />;
}
