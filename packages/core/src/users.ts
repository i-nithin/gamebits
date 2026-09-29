import { desc, eq, or, sql } from "drizzle-orm";

import { getDb, hasDatabase } from "@gamebits/db";
import { profiles } from "@gamebits/db/schema";

export async function isProfileSuspended(userId: string) {
  if (!hasDatabase()) return false;
  const db = getDb();
  const [row] = await db
    .select({ suspendedAt: profiles.suspendedAt })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  return Boolean(row?.suspendedAt);
}

export async function searchProfiles(query: string) {
  if (!hasDatabase()) return [];
  const db = getDb();
  const q = query.trim().toLowerCase();
  const filter = q
    ? or(
        sql`lower(${profiles.name}) like ${`%${q}%`}`,
        sql`lower(${profiles.handle}) like ${`%${q}%`}`,
        sql`lower(coalesce(${profiles.email}, '')) like ${`%${q}%`}`,
      )
    : undefined;
  return db
    .select({
      clerkUserId: profiles.clerkUserId,
      handle: profiles.handle,
      name: profiles.name,
      email: profiles.email,
      imageUrl: profiles.imageUrl,
      suspendedAt: profiles.suspendedAt,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(filter)
    .orderBy(desc(profiles.createdAt))
    .limit(50);
}

export async function findProfileByHandle(handle: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [row] = await db
    .select({
      clerkUserId: profiles.clerkUserId,
      handle: profiles.handle,
      name: profiles.name,
      email: profiles.email,
    })
    .from(profiles)
    .where(sql`lower(${profiles.handle}) = ${handle.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function setProfileSuspended(clerkUserId: string, suspended: boolean) {
  if (!hasDatabase()) throw new Error("Database is not configured");
  const db = getDb();
  const [row] = await db
    .update(profiles)
    .set({
      suspendedAt: suspended ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.clerkUserId, clerkUserId))
    .returning({ clerkUserId: profiles.clerkUserId });
  if (!row) throw new Error("Profile not found");
}
