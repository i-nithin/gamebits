"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { profiles } from "@/db/schema";
import { deletionGraceEnded } from "@/lib/account-deletion";
import { purgeAccount, revokeUserSessions } from "@/lib/account-purge";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb } from "@/lib/db";
import { isNotificationType } from "@/lib/notifications/catalog";
import { setNotificationPreference } from "@/lib/notifications/preferences";
import { HANDLE_RE, ensureCurrentProfile } from "@/lib/profile";
import { sanitizePlainText } from "@/lib/sanitize";

export async function updateNotificationPreferenceAction(type: string, enabled: boolean) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) {
    return { ok: false as const, error: "Sign in to continue" };
  }
  if (!isNotificationType(type) || typeof enabled !== "boolean") {
    return { ok: false as const, error: "That notification setting is not available" };
  }

  await setNotificationPreference(userId, type, enabled);
  return { ok: true as const };
}

export async function updateDisplayNameAction(name: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "Sign in to continue" };

  const clean = sanitizePlainText(name, 80);
  if (!clean) return { ok: false as const, error: "Name is required" };

  const profile = await ensureCurrentProfile();
  if (!profile || profile.clerkUserId !== userId || profile.deletedAt) {
    return { ok: false as const, error: "Sign in to continue" };
  }
  if (clean === profile.name) return { ok: true as const, name: clean };

  await getDb()
    .update(profiles)
    .set({ name: clean, updatedAt: new Date() })
    .where(eq(profiles.clerkUserId, userId));

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath(`/u/${profile.handle}`);
  revalidatePath(`/u/${profile.handle}/edit`);
  return { ok: true as const, name: clean };
}

export async function revokeSessionAction(sessionId: string) {
  if (!clerkEnabled) return { ok: false as const, error: "Sign in to continue" };

  const { userId, sessionId: currentSessionId } = await auth();
  if (!userId) return { ok: false as const, error: "Sign in to continue" };

  const id = sessionId.trim();
  if (!id.startsWith("sess_")) {
    return { ok: false as const, error: "That session is not yours" };
  }

  try {
    const client = await clerkClient();
    const session = await client.sessions.getSession(id);
    if (session.userId !== userId) {
      return { ok: false as const, error: "That session is not yours" };
    }
    if (session.status !== "active") {
      return { ok: false as const, error: "That session is already signed out" };
    }
    await client.sessions.revokeSession(id);
  } catch (error) {
    console.error("[settings] revoke session failed", error);
    return { ok: false as const, error: "Could not revoke that session" };
  }

  return { ok: true as const, current: id === currentSessionId };
}

export async function deleteAccountAction(confirmation: string) {
  if (!clerkEnabled) {
    return { ok: false as const, error: "Sign in to continue", expired: false as const };
  }

  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "Sign in to continue", expired: false as const };

  const typed = confirmation.trim().toLowerCase();
  if (!HANDLE_RE.test(typed)) {
    return { ok: false as const, error: "Type your handle to confirm", expired: false as const };
  }

  const db = getDb();
  const prepared = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        handle: profiles.handle,
        superAdmin: profiles.superAdmin,
        deletedAt: profiles.deletedAt,
        purgedAt: profiles.purgedAt,
      })
      .from(profiles)
      .where(eq(profiles.clerkUserId, userId))
      .limit(1)
      .for("update");

    if (!row) return { kind: "missing" as const };
    if (row.deletedAt) {
      if (row.purgedAt || deletionGraceEnded(row.deletedAt)) return { kind: "expired" as const };
      return { kind: "ready" as const, handle: row.handle };
    }
    if (row.handle.toLowerCase() !== typed) return { kind: "handle" as const };

    if (row.superAdmin) {
      const admins = await tx
        .select({ clerkUserId: profiles.clerkUserId })
        .from(profiles)
        .where(and(eq(profiles.superAdmin, true), isNull(profiles.deletedAt)))
        .for("update");
      if (admins.length <= 1) return { kind: "last_admin" as const };
    }

    await tx
      .update(profiles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(profiles.clerkUserId, userId), isNull(profiles.deletedAt)));

    return { kind: "ready" as const, handle: row.handle };
  });

  if (prepared.kind === "handle") {
    return { ok: false as const, error: "Handle does not match", expired: false as const };
  }
  if (prepared.kind === "last_admin") {
    return {
      ok: false as const,
      error: "Add another admin before deleting this account",
      expired: false as const,
    };
  }
  if (prepared.kind === "expired") {
    await purgeAccount(userId);
    return { ok: false as const, error: "The restore window has ended.", expired: true as const };
  }

  try {
    await revokeUserSessions(userId);
  } catch (error) {
    console.error("[settings] revoke sessions failed", error);
    return {
      ok: false as const,
      error: "Could not sign out every device. Try again.",
      expired: false as const,
    };
  }

  revalidatePath("/", "layout");
  if (prepared.kind === "ready") revalidatePath(`/u/${prepared.handle}`);
  revalidatePath("/4dm1n");
  return { ok: true as const };
}

export async function restoreAccountAction() {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "Sign in to continue", expired: false as const };

  const db = getDb();
  const [row] = await db
    .select({
      handle: profiles.handle,
      deletedAt: profiles.deletedAt,
      purgedAt: profiles.purgedAt,
    })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);

  if (!row?.deletedAt || row.purgedAt) {
    return { ok: false as const, error: "This account is closed", expired: false as const };
  }
  if (deletionGraceEnded(row.deletedAt)) {
    await purgeAccount(userId);
    return { ok: false as const, error: "The restore window has ended.", expired: true as const };
  }

  await db
    .update(profiles)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(profiles.clerkUserId, userId), isNull(profiles.purgedAt)));

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath(`/u/${row.handle}`);
  revalidatePath("/4dm1n");
  return { ok: true as const };
}
