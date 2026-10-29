import { createHash } from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import { gameReviews, profiles } from "@/db/schema";
import { revokeUserApiKeys } from "@/lib/api/keys";
import { ACCOUNT_DELETION_GRACE_MS, deletionGraceEnded } from "@/lib/account-deletion";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb, hasDatabase } from "@/lib/db";
import { DELETED_PROFILE_NAME } from "@/lib/profile";

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

function tombstoneHandle(clerkUserId: string) {
  const digest = createHash("sha256").update(clerkUserId).digest("hex").slice(0, 20);
  return `deleted_${digest}`;
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
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({
        handle: tombstoneHandle(clerkUserId),
        name: DELETED_PROFILE_NAME,
        email: null,
        imageUrl: null,
        coverUrl: null,
        city: null,
        country: null,
        headline: null,
        bio: null,
        websiteUrl: null,
        xUrl: null,
        githubUrl: null,
        linkedinUrl: null,
        redditUrl: null,
        purgedAt: now,
        superAdmin: false,
        updatedAt: now,
      })
      .where(and(eq(profiles.clerkUserId, clerkUserId), isNull(profiles.purgedAt)));
    await tx
      .update(gameReviews)
      .set({
        displayName: DELETED_PROFILE_NAME,
        imageUrl: null,
        updatedAt: now,
      })
      .where(eq(gameReviews.clerkUserId, clerkUserId));
  });
  try {
    await revokeUserApiKeys(clerkUserId);
  } catch (error) {
    console.error("[account] api key revoke failed", error);
  }
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
