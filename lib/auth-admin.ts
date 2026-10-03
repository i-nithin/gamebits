import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";

import { profiles } from "@/db/schema";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb, hasDatabase } from "@/lib/db";

export async function getCurrentUserId() {
  if (!clerkEnabled) return null;
  const { userId } = await auth();
  return userId;
}

export const getProfileAccess = cache(async function getProfileAccess(
  userId: string | null | undefined,
) {
  if (!userId || !hasDatabase()) {
    return { superAdmin: false, deleted: false };
  }
  const db = getDb();
  const [row] = await db
    .select({ superAdmin: profiles.superAdmin, deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  const deleted = Boolean(row?.deletedAt);
  return {
    superAdmin: row?.superAdmin === true && !deleted,
    deleted,
  };
});

export const getAdminAccess = cache(async function getAdminAccess(
  userId: string | null | undefined,
) {
  return (await getProfileAccess(userId)).superAdmin;
});

export async function isAccountClosed(userId: string | null | undefined) {
  return (await getProfileAccess(userId)).deleted;
}

export async function enforceAdminPage() {
  const userId = await getCurrentUserId();
  if (!(await getAdminAccess(userId))) notFound();
}

export async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!userId || !(await getAdminAccess(userId))) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function requireSignedIn() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function canManageGame(
  userId: string | null | undefined,
  ownerClerkUserId: string | null | undefined,
) {
  if (!userId) return false;
  const access = await getProfileAccess(userId);
  if (access.superAdmin) return true;
  if (access.deleted) return false;
  return Boolean(ownerClerkUserId && ownerClerkUserId === userId);
}
