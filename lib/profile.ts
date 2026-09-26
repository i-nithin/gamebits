import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { profiles } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getDb, hasDatabase } from "@/lib/db";
import { slugify } from "@/lib/sanitize";
import type { PublicProfile, Viewer } from "@/lib/types";

export const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

const publicColumns = {
  clerkUserId: profiles.clerkUserId,
  handle: profiles.handle,
  name: profiles.name,
  imageUrl: profiles.imageUrl,
  coverUrl: profiles.coverUrl,
  city: profiles.city,
  country: profiles.country,
  headline: profiles.headline,
  bio: profiles.bio,
  websiteUrl: profiles.websiteUrl,
  xUrl: profiles.xUrl,
  githubUrl: profiles.githubUrl,
  linkedinUrl: profiles.linkedinUrl,
  redditUrl: profiles.redditUrl,
  joinedAt: profiles.joinedAt,
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  if ("cause" in error) return isUniqueViolation((error as { cause: unknown }).cause);
  return false;
}

function baseHandle(username: string | null, name: string, userId: string) {
  const fromUsername = (username ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (HANDLE_RE.test(fromUsername)) return fromUsername;
  const fromName = slugify(name).replace(/-/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (HANDLE_RE.test(fromName)) return fromName;
  const suffix = userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-8) || "user";
  return `player_${suffix}`.slice(0, 30);
}

async function allocateHandle(base: string) {
  const db = getDb();
  const root = base.slice(0, 24);
  for (let i = 0; i < 20; i += 1) {
    const candidate = (i === 0 ? root : `${root}_${i + 1}`).slice(0, 30);
    if (!HANDLE_RE.test(candidate)) continue;
    const [taken] = await db
      .select({ clerkUserId: profiles.clerkUserId })
      .from(profiles)
      .where(eq(profiles.handle, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `player_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

function toPublicProfile(row: {
  clerkUserId: string;
  handle: string;
  name: string;
  imageUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  country: string | null;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  redditUrl: string | null;
  joinedAt: Date;
}): PublicProfile {
  return {
    ...row,
    joinedAt: row.joinedAt.toISOString(),
  };
}

export function formatMemberSince(joinedAtIso: string) {
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(joinedAtIso));
  return `Member since ${label}`;
}

export const getProfileByHandle = cache(async function getProfileByHandle(handle: string) {
  const normalized = handle.toLowerCase();
  if (!HANDLE_RE.test(normalized) || !hasDatabase()) return null;
  const db = getDb();
  const [row] = await db
    .select(publicColumns)
    .from(profiles)
    .where(eq(profiles.handle, normalized))
    .limit(1);
  return row ? toPublicProfile(row) : null;
});

export const getViewer = cache(async function getViewer(): Promise<Viewer | null> {
  if (!clerkEnabled || !hasDatabase()) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const db = getDb();
  const [row] = await db
    .select({ name: profiles.name, handle: profiles.handle, imageUrl: profiles.imageUrl })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  if (!row) return { name: "", handle: "", imageUrl: null };
  return row;
});

export async function getProfileHandle(clerkUserId: string) {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [row] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  return row?.handle ?? null;
}

function clerkEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  return user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export async function ensureCurrentProfile() {
  if (!clerkEnabled || !hasDatabase()) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const db = getDb();
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);

  const user = await currentUser();
  if (!user) return existing ?? null;

  const email = clerkEmail(user);
  if (existing) {
    if (email && email !== existing.email) {
      await db
        .update(profiles)
        .set({ email, updatedAt: new Date() })
        .where(eq(profiles.clerkUserId, userId));
      return { ...existing, email };
    }
    return existing;
  }

  const name = (user.fullName || user.username || "Player").slice(0, 80);
  const joinedAt = new Date(user.createdAt);
  const handle = await allocateHandle(baseHandle(user.username, name, userId));
  try {
    const [created] = await db
      .insert(profiles)
      .values({
        clerkUserId: userId,
        handle,
        name,
        email,
        imageUrl: user.imageUrl || null,
        joinedAt: Number.isNaN(joinedAt.getTime()) ? new Date() : joinedAt,
      })
      .returning();
    return created;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, userId))
      .limit(1);
    if (row) return row;
    const retryHandle = await allocateHandle(`player_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`);
    const [created] = await db
      .insert(profiles)
      .values({
        clerkUserId: userId,
        handle: retryHandle,
        name,
        email,
        imageUrl: user.imageUrl || null,
        joinedAt: Number.isNaN(joinedAt.getTime()) ? new Date() : joinedAt,
      })
      .returning();
    return created;
  }
}
