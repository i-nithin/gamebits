import { after } from "next/server";
import { NextResponse } from "next/server";

import { countryFromHeaders } from "@/lib/analytics/geo";
import { recordLinkClick } from "@/lib/analytics/record";
import { resolveVisitorKey } from "@/lib/analytics/visitor";
import { resolveOutboundDestination } from "@/lib/analytics/outbound";
import { getAdminAccess, getCurrentUserId } from "@/lib/auth-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getGameBySlug } from "@/lib/queries";
import { sanitizeHttpsUrl } from "@/lib/urls";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const userPromise = getCurrentUserId();
  const { slug } = await params;
  const kind = new URL(request.url).searchParams.get("kind");
  const [game, userId] = await Promise.all([getGameBySlug(slug), userPromise]);
  if (!game || game.archivedAt) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const destination = await resolveOutboundDestination({
    gameId: game.id,
    primaryUrl: game.primaryUrl,
    kind,
  });
  const safeDestination = destination ? sanitizeHttpsUrl(destination.url) : null;
  if (!destination || !safeDestination) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const limit = await rateLimit("click", clientIp(request.headers));
  if (limit === "unavailable") {
    return new Response("Service unavailable", { status: 503 });
  }

  const shouldTrack =
    limit === "ok" &&
    !(await getAdminAccess(userId)) &&
    !(userId && game.ownerClerkUserId && game.ownerClerkUserId === userId);
  const visitorKey = shouldTrack ? await resolveVisitorKey(userId) : null;

  if (shouldTrack && visitorKey) {
    const gameId = game.id;
    const linkKind = destination.linkKind;
    const country = countryFromHeaders(request.headers);
    after(async () => {
      try {
        await recordLinkClick(gameId, linkKind, userId, country, visitorKey);
      } catch (error) {
        console.error("[analytics] link click failed", error);
      }
    });
  }

  return NextResponse.redirect(safeDestination, 302);
}
