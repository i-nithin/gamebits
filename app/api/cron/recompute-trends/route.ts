import { timingSafeEqual } from "node:crypto";

import { recomputeTrends } from "@/lib/trending/recompute";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) return false;
  const expected = `Bearer ${secret}`;
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await recomputeTrends();
    return Response.json(result);
  } catch (error) {
    console.error("[cron] recompute trends failed", error);
    return new Response("Recompute trends failed", { status: 500 });
  }
}
