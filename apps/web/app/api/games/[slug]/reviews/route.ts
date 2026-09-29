import { NextResponse } from "next/server";

import { getGameBySlug, listGameReviews } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game || game.archivedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cursor = new URL(request.url).searchParams.get("cursor");
  const page = await listGameReviews({ gameId: game.id, cursor });
  return NextResponse.json(page);
}
