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

export const getAdminAccess = cache(async function getAdminAccess(
  userId: string | null | undefined,
) {
  if (!userId || !hasDatabase()) return false;
  const db = getDb();
  const [row] = await db
    .select({ superAdmin: profiles.superAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  return row?.superAdmin === true;
});

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
  if (await getAdminAccess(userId)) return true;
  return Boolean(ownerClerkUserId && ownerClerkUserId === userId);
}
