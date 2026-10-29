import type { RateLimitDetail } from "@/lib/rate-limit";

const PRIVATE_CACHE = "private, no-store";

export function rateHeaders(limit: RateLimitDetail) {
  return {
    "Cache-Control": PRIVATE_CACHE,
    "X-RateLimit-Limit": String(limit.limit),
    "X-RateLimit-Remaining": String(Math.max(0, limit.remaining)),
  };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, string>,
) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": PRIVATE_CACHE, ...extra } },
  );
}

export function apiJson(body: unknown, limit: RateLimitDetail) {
  return Response.json(body, { headers: rateHeaders(limit) });
}

export function apiLimited(limit: RateLimitDetail) {
  const seconds = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
  return apiError("rate_limited", "Too many requests", 429, {
    ...rateHeaders(limit),
    "Retry-After": String(seconds),
  });
}

export function apiNotFound(message: string) {
  return apiError("not_found", message, 404);
}

export function apiInvalid() {
  return apiError("invalid_request", "Invalid request", 400);
}

export function tighterLimit(minute: RateLimitDetail, day: RateLimitDetail) {
  if (minute.status !== "ok") return minute;
  if (day.status !== "ok") return day;
  const minuteRatio = minute.remaining / Math.max(minute.limit, 1);
  const dayRatio = day.remaining / Math.max(day.limit, 1);
  return minuteRatio <= dayRatio ? minute : day;
}
