import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { ACCOUNT_DELETION_GRACE_MS, deletionGraceEnded } from "@/lib/account-deletion";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb, hasDatabase } from "@/lib/db";

const PURGE_BATCH = 100;

export function isClerkNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("status" in error && (error as { status?: unknown }).status === 404) return true;
  if (!("errors" in error) || !Array.isArray((error as { errors?: unknown }).errors)) return false;
  return (error as { errors: Array<{ code?: unknown }> }).errors.some(
    (item) => item?.code === "resource_not_found",
  );
}

export async function revokeUserSessions(userId: string) {
  if (!clerkEnabled) return;
  const client = await clerkClient();
  const list = await client.sessions.getSessionList({ userId, status: "active", limit: 100 });
  await Promise.all(list.data.map((session) => client.sessions.revokeSession(session.id)));
}

async function deleteClerkUser(userId: string) {
  if (!clerkEnabled) return;
  const client = await clerkClient();
  try {
    await client.users.deleteUser(userId);
  } catch (error) {
    if (!isClerkNotFound(error)) throw error;
  }
}

export async function purgeAccount(clerkUserId: string) {
  if (!hasDatabase()) return false;
  const db = getDb();
  const [row] = await db
    .select({ deletedAt: profiles.deletedAt, purgedAt: profiles.purgedAt })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  if (!row?.deletedAt || row.purgedAt || !deletionGraceEnded(row.deletedAt)) return false;

  await deleteClerkUser(clerkUserId);
  await db
    .update(profiles)
    .set({ purgedAt: new Date(), superAdmin: false, updatedAt: new Date() })
    .where(and(eq(profiles.clerkUserId, clerkUserId), isNull(profiles.purgedAt)));
  return true;
}

export async function purgeDueAccounts() {
  if (!hasDatabase()) return 0;
  const cutoff = new Date(Date.now() - ACCOUNT_DELETION_GRACE_MS);
  const db = getDb();
  const due = await db
    .select({ clerkUserId: profiles.clerkUserId })
    .from(profiles)
    .where(
      and(isNotNull(profiles.deletedAt), lt(profiles.deletedAt, cutoff), isNull(profiles.purgedAt)),
    )
    .limit(PURGE_BATCH);

  let purged = 0;
  for (const row of due) {
    if (await purgeAccount(row.clerkUserId)) purged += 1;
  }
  return purged;
}

export async function expireAccountIfNeeded() {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  return purgeAccount(userId);
}
