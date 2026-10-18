import { cache } from "react";

import { deletionDeadline, deletionGraceEnded } from "@/lib/account-deletion";
import { purgeAccount } from "@/lib/account-purge";
import { getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile } from "@/lib/profile";

type CurrentProfile = NonNullable<Awaited<ReturnType<typeof ensureCurrentProfile>>>;

export type SettingsGate =
  | { status: "signed-out" }
  | { status: "removed" }
  | { status: "unavailable" }
  | {
      status: "ready";
      profile: CurrentProfile;
      scheduled: boolean;
      deletionDeadline: string | null;
    };

export const getSettingsGate = cache(async function getSettingsGate(): Promise<SettingsGate> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: "signed-out" };

  const profile = await ensureCurrentProfile();
  if (profile?.deletedAt && (profile.purgedAt || deletionGraceEnded(profile.deletedAt))) {
    if (!profile.purgedAt) await purgeAccount(userId);
    return { status: "removed" };
  }
  if (!profile) return { status: "unavailable" };

  return {
    status: "ready",
    profile,
    scheduled: Boolean(profile.deletedAt),
    deletionDeadline: profile.deletedAt ? deletionDeadline(profile.deletedAt).toISOString() : null,
  };
});
