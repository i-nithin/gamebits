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
  | "review";

const WINDOWS: Record<RateLimitName, [number, `${number} s`]> = {
  search: [30, "60 s"],
  upload: [20, "60 s"],
  pageview: [30, "60 s"],
  click: [60, "60 s"],
  report: [8, "600 s"],
  vote: [30, "60 s"],
  like: [30, "60 s"],
  bookmark: [30, "60 s"],
  follow: [20, "60 s"],
  review: [10, "60 s"],
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
  const [tokens, window] = WINDOWS[name];
  const created = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `gb:${name}`,
    analytics: false,
  });
  limiters.set(name, created);
  return created;
}

export async function rateLimit(
  name: RateLimitName,
  key: string,
): Promise<"ok" | "limited" | "unavailable"> {
  if (!configured()) {
    return process.env.NODE_ENV === "production" ? "unavailable" : "ok";
  }
  try {
    const result = await limiter(name).limit(key || "unknown");
    return result.success ? "ok" : "limited";
  } catch (error) {
    console.error("[rate-limit] failed", error);
    return "unavailable";
  }
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
