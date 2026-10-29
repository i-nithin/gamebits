import { createHash } from "node:crypto";

import { Redis } from "@upstash/redis";

const RESPONSE_LIMIT = 256 * 1024;
const AUTH_TTL_SECONDS = 60;
const UNKNOWN_AUTH_TTL_SECONDS = 30;
const REVOKED_TTL_SECONDS = 120;

export type CachedApiKey =
  | { active: false }
  | { active: true; keyId: string; userId: string; scopes: string[]; expiresAt?: string | null };

let redis: Redis | null | undefined;

export function apiRedis() {
  if (redis !== undefined) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = null;
    return redis;
  }
  redis = Redis.fromEnv();
  return redis;
}

function authCacheKey(hash: string) {
  return `gb:apikey:${hash}`;
}

function revokedCacheKey(hash: string) {
  return `gb:apikey:revoked:${hash}`;
}

function responseCacheKey(logicalKey: string) {
  const digest = createHash("sha256").update(logicalKey).digest("hex");
  return `gb:apicache:${digest}`;
}

function isCachedKey(value: unknown): value is CachedApiKey {
  if (!value || typeof value !== "object") return false;
  const record = value as { active?: unknown; keyId?: unknown; userId?: unknown; scopes?: unknown };
  if (record.active === false) return true;
  return (
    record.active === true &&
    typeof record.keyId === "string" &&
    typeof record.userId === "string" &&
    Array.isArray(record.scopes) &&
    record.scopes.every((scope) => typeof scope === "string")
  );
}

export async function readCachedKey(hash: string) {
  const client = apiRedis();
  if (!client) return null;
  try {
    const [revoked, value] = await Promise.all([
      client.get(revokedCacheKey(hash)),
      client.get<unknown>(authCacheKey(hash)),
    ]);
    if (revoked) return { active: false } as const;
    return isCachedKey(value) ? value : null;
  } catch (error) {
    console.error("[api] key cache read failed", error);
    return null;
  }
}

export async function writeCachedKey(hash: string, value: CachedApiKey, ttlSeconds = AUTH_TTL_SECONDS) {
  const client = apiRedis();
  if (!client) return;
  try {
    if (value.active) {
      const revoked = await client.get(revokedCacheKey(hash));
      if (revoked) return;
    }
    await client.set(authCacheKey(hash), value, { ex: ttlSeconds });
  } catch (error) {
    console.error("[api] key cache write failed", error);
  }
}

export function unknownKeyCacheTtl() {
  return UNKNOWN_AUTH_TTL_SECONDS;
}

async function forgetApiKeyHash(client: Redis, hash: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await client.set(revokedCacheKey(hash), "1", { ex: REVOKED_TTL_SECONDS });
      await client.del(authCacheKey(hash));
      return;
    } catch (error) {
      lastError = error;
    }
  }
  console.error("[api] key cache delete failed", lastError);
}

export async function forgetApiKeyHashes(hashes: string[]) {
  const client = apiRedis();
  if (!client || hashes.length === 0) return;
  await Promise.all(hashes.map((hash) => forgetApiKeyHash(client, hash)));
}

export async function cachedApiRead<T>(
  logicalKey: string,
  ttlSeconds: number | ((value: T) => number),
  load: () => Promise<T | null>,
): Promise<T | null> {
  const client = apiRedis();
  const key = responseCacheKey(logicalKey);
  if (client) {
    try {
      const hit = await client.get<T>(key);
      if (hit !== null && hit !== undefined) return hit;
    } catch (error) {
      console.error("[api] response cache read failed", error);
    }
  }

  const value = await load();
  if (value === null || !client) return value;
  const ttl = typeof ttlSeconds === "number" ? ttlSeconds : ttlSeconds(value);
  if (ttl <= 0) return value;
  const encoded = JSON.stringify(value);
  if (encoded.length > RESPONSE_LIMIT) return value;
  try {
    await client.set(key, value, { ex: ttl });
  } catch (error) {
    console.error("[api] response cache write failed", error);
  }
  return value;
}
