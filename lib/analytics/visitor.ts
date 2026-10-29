import { cookies } from "next/headers";

import { isUuid } from "@/lib/sanitize";

const VISITOR_COOKIE = "gb_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 400;

export async function resolveVisitorKey(clerkUserId: string | null) {
  if (clerkUserId) return `clerk:${clerkUserId}`;

  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing && isUuid(existing)) return `anon:${existing}`;

  jar.set(VISITOR_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
  return null;
}
