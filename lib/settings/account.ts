import { auth, clerkClient } from "@clerk/nextjs/server";

export type AccountEmail = {
  email: string;
  primary: boolean;
};

export type AccountProvider = {
  id: string;
  key: string;
  label: string;
  detail: string | null;
};

export type AccountSession = {
  id: string;
  current: boolean;
  mobile: boolean;
  browser: string | null;
  device: string | null;
  place: string | null;
  lastActiveAt: number;
};

export type ClerkAccount = {
  emails: AccountEmail[];
  username: string | null;
  passwordEnabled: boolean;
  providers: AccountProvider[];
  sessions: AccountSession[];
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  discord: "Discord",
  microsoft: "Microsoft",
  facebook: "Facebook",
  x: "X",
  twitter: "X",
  linkedin: "LinkedIn",
  twitch: "Twitch",
};

function providerKey(provider: string) {
  return provider.replace(/^oauth_/, "").toLowerCase();
}

function providerLabel(provider: string) {
  const key = providerKey(provider);
  if (PROVIDER_LABELS[key]) return PROVIDER_LABELS[key];
  if (!key) return "Connected account";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function getClerkAccount(userId: string): Promise<ClerkAccount> {
  const authState = await auth();
  if (!authState.userId || authState.userId !== userId) {
    throw new Error("Unauthorized");
  }
  const client = await clerkClient();
  const [user, sessionList] = await Promise.all([
    client.users.getUser(authState.userId),
    client.sessions.getSessionList({ userId: authState.userId, status: "active", limit: 100 }),
  ]);

  const emails = user.emailAddresses
    .map((item) => ({
      email: item.emailAddress,
      primary: item.id === user.primaryEmailAddressId,
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary));

  const providers = user.externalAccounts.map((account) => ({
    id: account.id,
    key: providerKey(account.provider),
    label: providerLabel(account.provider),
    detail: account.emailAddress || account.username || null,
  }));

  const currentSessionId = authState.sessionId;
  const sessions = sessionList.data
    .map((session) => {
      const activity = session.latestActivity;
      const place = [activity?.city, activity?.country].filter(Boolean).join(", ");
      return {
        id: session.id,
        current: session.id === currentSessionId,
        mobile: Boolean(activity?.isMobile),
        browser: activity?.browserName ?? null,
        device: activity?.deviceType ?? null,
        place: place || null,
        lastActiveAt: session.lastActiveAt,
      };
    })
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return b.lastActiveAt - a.lastActiveAt;
    });

  return {
    emails,
    username: user.username,
    passwordEnabled: user.passwordEnabled,
    providers,
    sessions,
  };
}
