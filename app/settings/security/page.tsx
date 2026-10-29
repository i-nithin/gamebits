import { AccountSettings } from "@/components/settings/account-settings";
import { getClerkAccount } from "@/lib/settings/account";
import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsSecurityPage() {
  const gate = await getSettingsGate();
  if (gate.status !== "ready") return null;

  if (gate.scheduled) {
    return (
      <AccountSettings
        handle={gate.profile.handle}
        deletionDeadline={gate.deletionDeadline}
        account={null}
        accountError={null}
      />
    );
  }

  const accountResult = await getClerkAccount(gate.profile.clerkUserId).then(
    (account) => ({ account, error: null as string | null }),
    (error: unknown) => {
      console.error("[settings] clerk account failed", error);
      return { account: null, error: "Login details are unavailable right now." };
    },
  );

  return (
    <AccountSettings
      handle={gate.profile.handle}
      deletionDeadline={null}
      account={accountResult.account}
      accountError={accountResult.error}
    />
  );
}

export const metadata = { title: 'Security Settings', robots: { index: false, follow: false } };
