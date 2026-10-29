import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { apiKeys } from "@/db/schema";
import { readCachedKey, unknownKeyCacheTtl, writeCachedKey, apiRedis } from "@/lib/api/cache";
import { apiError, apiLimited, tighterLimit } from "@/lib/api/http";
import { lookupApiKey } from "@/lib/api/keys";
import { apiKeyAccess, hashApiToken, isApiKeyExpired, isApiToken } from "@/lib/api/token";
import { getDb } from "@/lib/db";
import { clientIp, rateLimitDetail, type RateLimitDetail } from "@/lib/rate-limit";

const BEARER_RE = /^Bearer ([A-Za-z0-9_-]+)$/;

export type ApiAuth =
  | { ok: true; keyId: string; limit: RateLimitDetail }
  | { ok: false; response: Response };

function readBearer(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) return { kind: "missing" as const };
  const match = BEARER_RE.exec(header.trim());
  if (!match) return { kind: "malformed" as const };
  return { kind: "token" as const, token: match[1] };
}

async function rejectAuth(request: Request, message: string) {
  const detail = await rateLimitDetail("apiAuthFail", clientIp(request.headers));
  if (detail.status === "unavailable") {
    return apiError("unavailable", "Try again in a moment.", 503);
  }
  if (detail.status === "limited") return apiLimited(detail);
  return apiError("unauthorized", message, 401, {
    "WWW-Authenticate": 'Bearer realm="gamebits"',
  });
}

async function resolveKey(token: string) {
  const hash = hashApiToken(token);
  const cached = await readCachedKey(hash);
  if (cached?.active === false) return null;
  if (cached?.active === true) {
    if (!cached.scopes.includes("read") || isApiKeyExpired(cached.expiresAt)) return null;
    return { keyId: cached.keyId };
  }

  const row = await lookupApiKey(hash);
  if (!row || apiKeyAccess(row) !== "ok") {
    if (row) await writeCachedKey(hash, { active: false });
    else await writeCachedKey(hash, { active: false }, unknownKeyCacheTtl());
    return null;
  }
  await writeCachedKey(hash, {
    active: true,
    keyId: row.id,
    userId: row.clerkUserId,
    scopes: [...row.scopes],
    expiresAt: row.expiresAt?.toISOString() ?? null,
  });
  return { keyId: row.id };
}

function touchApiKey(keyId: string) {
  after(async () => {
    try {
      const redis = apiRedis();
      if (!redis) return;
      const gate = await redis.set(`gb:apikey:seen:${keyId}`, "1", { nx: true, ex: 15 * 60 });
      if (gate !== "OK") return;
      await getDb()
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)));
    } catch (error) {
      console.error("[api] last used update failed", error);
    }
  });
}

export async function authenticateApiRequest(request: Request): Promise<ApiAuth> {
  const bearer = readBearer(request);
  if (bearer.kind === "missing") {
    return { ok: false, response: await rejectAuth(request, "Missing API key") };
  }
  if (bearer.kind === "malformed" || !isApiToken(bearer.token)) {
    return { ok: false, response: await rejectAuth(request, "Invalid API key") };
  }

  const key = await resolveKey(bearer.token);
  if (!key) {
    return { ok: false, response: await rejectAuth(request, "Invalid API key") };
  }

  const [minute, day] = await Promise.all([
    rateLimitDetail("api", key.keyId),
    rateLimitDetail("apiDay", key.keyId),
  ]);
  if (minute.status === "unavailable" || day.status === "unavailable") {
    return { ok: false, response: apiError("unavailable", "Try again in a moment.", 503) };
  }
  const limit = tighterLimit(minute, day);
  if (limit.status === "limited") {
    return { ok: false, response: apiLimited(limit) };
  }

  touchApiKey(key.keyId);
  return { ok: true, keyId: key.keyId, limit };
}

export async function withApiKey(
  request: Request,
  handle: (limit: RateLimitDetail) => Promise<Response>,
) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;
  try {
    return await handle(auth.limit);
  } catch (error) {
    console.error("[api] read failed", error);
    return apiError("unavailable", "Try again in a moment.", 503);
  }
}
