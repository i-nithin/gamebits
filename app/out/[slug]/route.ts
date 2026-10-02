import { after } from "next/server";
import { NextResponse } from "next/server";

import { countryFromHeaders } from "@/lib/analytics/geo";
import { recordLinkClick } from "@/lib/analytics/record";
import { resolveOutboundDestination } from "@/lib/analytics/outbound";
import { getAdminAccess, getCurrentUserId } from "@/lib/auth-admin";
import { getGameBySlug } from "@/lib/queries";

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
  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const shouldTrack =
    !(await getAdminAccess(userId)) &&
    !(userId && game.ownerClerkUserId && game.ownerClerkUserId === userId);

  if (shouldTrack) {
    const gameId = game.id;
    const linkKind = destination.linkKind;
    const country = countryFromHeaders(request.headers);
    after(async () => {
      try {
        await recordLinkClick(gameId, linkKind, userId, country);
      } catch (error) {
        console.error("[analytics] link click failed", error);
      }
    });
  }

  return NextResponse.redirect(destination.url, 302);
}
