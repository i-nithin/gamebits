import { after } from "next/server";
import { NextResponse } from "next/server";

import { getApprovedAdDestination, incrementAdClicks } from "@/lib/ads";
import { orderPhase } from "@/lib/ads-month";
import { getAdminAccess, getCurrentUserId } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

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
  if (!ad) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const phase = orderPhase(
    "approved",
    { year: ad.year, month: ad.month },
    Number(ad.active),
  );
  const shouldTrack =
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

  return NextResponse.redirect(ad.destinationUrl, 302);
}
