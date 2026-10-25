import { timingSafeEqual } from "node:crypto";

import { snapshotClosedWeeks } from "@/lib/week-rank";

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
    const result = await snapshotClosedWeeks();
    return Response.json(result);
  } catch (error) {
    console.error("[cron] snapshot week ranks failed", error);
    return new Response("Snapshot week ranks failed", { status: 500 });
  }
}
