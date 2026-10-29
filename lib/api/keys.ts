import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import { apiKeys, profiles } from "@/db/schema";
import { forgetApiKeyHashes } from "@/lib/api/cache";
import {
  MAX_LIVE_API_KEYS,
  createApiToken,
  describeApiToken,
  hashApiToken,
} from "@/lib/api/token";
import { getDb, hasDatabase } from "@/lib/db";

export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  keyLast4: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

function toListItem(row: {
  id: string;
  name: string;
  keyPrefix: string;
  keyLast4: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    keyLast4: row.keyLast4,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

function liveKeyWhere(clerkUserId: string, now: Date) {
  return and(
    eq(apiKeys.clerkUserId, clerkUserId),
    isNull(apiKeys.revokedAt),
    or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
  );
}

export async function listActiveApiKeys(clerkUserId: string) {
  if (!hasDatabase()) return [];
  const rows = await getDb()
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      keyLast4: apiKeys.keyLast4,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.clerkUserId, clerkUserId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map(toListItem);
}

export async function createApiKey(clerkUserId: string, name: string, expiresAt: Date | null) {
  if (!hasDatabase()) return { ok: false as const, error: "Try again in a moment." };
  const token = createApiToken();
  const parts = describeApiToken(token);
  if (!parts) return { ok: false as const, error: "Could not create an API key." };

  const created = await getDb().transaction(async (tx) => {
    const [profile] = await tx
      .select({ clerkUserId: profiles.clerkUserId })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1)
      .for("update");
    if (!profile) return { kind: "missing" as const };

    const live = await tx
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(liveKeyWhere(clerkUserId, new Date()));
    if (live.length >= MAX_LIVE_API_KEYS) return { kind: "full" as const };

    const [row] = await tx
      .insert(apiKeys)
      .values({
        clerkUserId,
        name,
        keyPrefix: parts.keyPrefix,
        keyLast4: parts.keyLast4,
        keyHash: hashApiToken(token),
        scopes: ["read"],
        expiresAt,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        keyLast4: apiKeys.keyLast4,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
      });
    if (!row) return { kind: "missing" as const };
    return { kind: "created" as const, key: toListItem(row) };
  });

  if (created.kind === "full") {
    return { ok: false as const, error: "You can have up to 5 active keys." };
  }
  if (created.kind !== "created") {
    return { ok: false as const, error: "Sign in to continue" };
  }
  return { ok: true as const, token, key: created.key };
}

export async function revokeApiKey(clerkUserId: string, id: string) {
  if (!hasDatabase()) return false;
  const rows = await getDb()
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.clerkUserId, clerkUserId), isNull(apiKeys.revokedAt)))
    .returning({ keyHash: apiKeys.keyHash });
  await forgetApiKeyHashes(rows.map((row) => row.keyHash));
  return rows.length > 0;
}

export async function revokeUserApiKeys(clerkUserId: string) {
  if (!hasDatabase()) return;
  const rows = await getDb()
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.clerkUserId, clerkUserId), isNull(apiKeys.revokedAt)))
    .returning({ keyHash: apiKeys.keyHash });
  await forgetApiKeyHashes(rows.map((row) => row.keyHash));
}

export async function lookupApiKey(hash: string) {
  if (!hasDatabase()) return null;
  const [row] = await getDb()
    .select({
      id: apiKeys.id,
      clerkUserId: apiKeys.clerkUserId,
      scopes: apiKeys.scopes,
      revokedAt: apiKeys.revokedAt,
      expiresAt: apiKeys.expiresAt,
      bannedAt: profiles.bannedAt,
      deletedAt: profiles.deletedAt,
      purgedAt: profiles.purgedAt,
    })
    .from(apiKeys)
    .innerJoin(profiles, eq(profiles.clerkUserId, apiKeys.clerkUserId))
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);
  return row ?? null;
}
