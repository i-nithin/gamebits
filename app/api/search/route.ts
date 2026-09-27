import { NextResponse } from "next/server";
import { z } from "zod";

import { searchCatalog } from "@/lib/search";
import type { SearchScope } from "@/lib/types";

const searchSchema = z.object({
  q: z.string().trim().min(1).max(80),
  scope: z.enum(["all", "games", "people"]),
  platform: z.string().trim().max(64).regex(/^[a-z0-9-]*$/),
});

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    scope: url.searchParams.get("scope") ?? "all",
    platform: url.searchParams.get("platform") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const scope: SearchScope = parsed.data.scope;
  const body = await searchCatalog({
    q: parsed.data.q,
    scope,
    platform: parsed.data.platform || null,
  });

  return NextResponse.json(body, { headers: cacheHeaders });
}
