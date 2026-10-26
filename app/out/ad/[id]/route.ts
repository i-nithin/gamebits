import { after } from "next/server";
import { NextResponse } from "next/server";

import { getApprovedAdDestination, incrementAdClicks } from "@/lib/ads";
import { bookingPhase } from "@/lib/ads-week";
import { getAdminAccess, getCurrentUserId } from "@/lib/auth-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/sanitize";
import { sanitizeHttpsUrl } from "@/lib/urls";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userPromise = getCurrentUserId();
  if (!isUuid(id)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const [ad, userId] = await Promise.all([getApprovedAdDestination(id), userPromise]);
  const destination = ad ? sanitizeHttpsUrl(ad.destinationUrl) : null;
  if (!ad || !destination) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const phase = bookingPhase(
    "approved",
    { year: ad.year, month: ad.month },
    Number(ad.active),
    ad.weekStarts,
  );
  const limit = await rateLimit("click", clientIp(request.headers));
  if (limit === "unavailable") {
    return new Response("Service unavailable", { status: 503 });
  }

  const shouldTrack =
    limit === "ok" &&
    phase === "live" &&
    userId !== ad.ownerClerkUserId &&
    !(await getAdminAccess(userId));

  if (shouldTrack) {
    after(async () => {
      try {
        await incrementAdClicks(id);
      } catch (error) {
        console.error("[ads] click count failed", error);
      }
    });
  }

  return NextResponse.redirect(destination, 302);
}
