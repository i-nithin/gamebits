import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitName =
  | "search"
  | "upload"
  | "pageview"
  | "click"
  | "report"
  | "vote"
  | "like"
  | "bookmark"
  | "follow"
  | "review"
  | "api"
  | "apiDay"
  | "apiAuthFail"
  | "apiKeyCreate";

type WindowSpec = {
  tokens: number;
  window: `${number} s`;
  mode?: "fixed";
};

const WINDOWS: Record<RateLimitName, WindowSpec> = {
  search: { tokens: 30, window: "60 s" },
  upload: { tokens: 20, window: "60 s" },
  pageview: { tokens: 30, window: "60 s" },
  click: { tokens: 60, window: "60 s" },
  report: { tokens: 8, window: "600 s" },
  vote: { tokens: 30, window: "60 s" },
  like: { tokens: 30, window: "60 s" },
  bookmark: { tokens: 30, window: "60 s" },
  follow: { tokens: 20, window: "60 s" },
  review: { tokens: 10, window: "60 s" },
  api: { tokens: 60, window: "60 s" },
  apiDay: { tokens: 5000, window: "86400 s", mode: "fixed" },
  apiAuthFail: { tokens: 20, window: "60 s" },
  apiKeyCreate: { tokens: 10, window: "3600 s" },
};

let redis: Redis | null = null;
const limiters = new Map<RateLimitName, Ratelimit>();

function configured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function limiter(name: RateLimitName) {
  const existing = limiters.get(name);
  if (existing) return existing;
  redis ??= Redis.fromEnv();
  const spec = WINDOWS[name];
  const created = new Ratelimit({
    redis,
    limiter:
      spec.mode === "fixed"
        ? Ratelimit.fixedWindow(spec.tokens, spec.window)
        : Ratelimit.slidingWindow(spec.tokens, spec.window),
    prefix: `gb:${name}`,
    analytics: false,
  });
  limiters.set(name, created);
  return created;
}

export type RateLimitDetail = {
  status: "ok" | "limited" | "unavailable";
  limit: number;
  remaining: number;
  reset: number;
};

export async function rateLimitDetail(
  name: RateLimitName,
  key: string,
): Promise<RateLimitDetail> {
  const tokens = WINDOWS[name].tokens;
  if (!configured()) {
    if (process.env.NODE_ENV === "production") {
      return { status: "unavailable", limit: tokens, remaining: 0, reset: Date.now() + 1000 };
    }
    return { status: "ok", limit: tokens, remaining: tokens, reset: Date.now() + 60_000 };
  }
  try {
    const result = await limiter(name).limit(key || "unknown");
    return {
      status: result.success ? "ok" : "limited",
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[rate-limit] failed", error);
    return { status: "unavailable", limit: tokens, remaining: 0, reset: Date.now() + 1000 };
  }
}

export async function rateLimit(
  name: RateLimitName,
  key: string,
): Promise<"ok" | "limited" | "unavailable"> {
  const detail = await rateLimitDetail(name, key);
  return detail.status;
}

function lastHop(value: string | null) {
  if (!value) return null;
  const hops = value.split(",").map((part) => part.trim()).filter(Boolean);
  return hops.at(-1) ?? null;
}

export function clientIp(headers: Headers) {
  const vercel = lastHop(headers.get("x-vercel-forwarded-for"));
  if (vercel) return vercel;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return lastHop(headers.get("x-forwarded-for")) ?? "unknown";
}

export function rateLimitResponse(result: "limited" | "unavailable") {
  if (result === "limited") {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  return Response.json({ error: "Service unavailable" }, { status: 503 });
}
