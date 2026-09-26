import { after } from "next/server";
import { NextResponse } from "next/server";

import { getGameBySlug, incrementOutboundClicks } from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game || game.archivedAt) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  const gameId = game.id;
  after(async () => {
    await incrementOutboundClicks(gameId);
  });

  return NextResponse.redirect(game.primaryUrl, 302);
}
