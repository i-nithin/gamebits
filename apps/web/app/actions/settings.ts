"use server";

import { eq } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { profiles } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb } from "@/lib/db";
import { isNotificationType } from "@/lib/notifications/catalog";
import { setNotificationPreference } from "@/lib/notifications/preferences";
import { ensureCurrentProfile } from "@/lib/profile";
import { sanitizePlainText } from "@/lib/sanitize";

export async function updateNotificationPreferenceAction(type: string, enabled: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: "Sign in to continue" };
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
  if (!profile || profile.clerkUserId !== userId) {
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
