import { redirect } from "next/navigation";

import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsPage() {
  const gate = await getSettingsGate();
  if (gate.status === "ready") redirect("/settings/profile");
  return null;
}
