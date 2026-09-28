import { after } from "next/server";
import { NextResponse } from "next/server";

import { recordLinkClick } from "@/lib/analytics/record";
import { resolveOutboundDestination } from "@/lib/analytics/outbound";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getGameBySlug, incrementOutboundClicks } from "@/lib/queries";

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

  const gameId = game.id;
  const linkKind = destination.linkKind;
  after(async () => {
    await Promise.all([
      incrementOutboundClicks(gameId),
      recordLinkClick(gameId, linkKind, userId),
    ]).catch((error) => console.error("[analytics] link click failed", error));
  });

  return NextResponse.redirect(destination.url, 302);
}
