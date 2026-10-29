import { withApiKey } from "@/lib/api/auth";
import { readTrending } from "@/lib/api/catalog";
import { apiInvalid, apiJson } from "@/lib/api/http";
import { readFilters, readPage, trendQuery } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async (limit) => {
    const url = new URL(request.url);
    const page = readPage(url);
    const filters = readFilters(url);
    const parsed = trendQuery.safeParse({
      ...(url.searchParams.get("range") ? { range: url.searchParams.get("range") } : {}),
      ...(page?.cursor ? { cursor: page.cursor } : {}),
      ...(page?.limit ? { limit: page.limit } : {}),
    });
    if (!page || !filters || !parsed.success) return apiInvalid();
    const result = await readTrending({
      range: parsed.data.range ?? "today",
      platforms: filters.platforms,
      categories: filters.categories,
      statuses: filters.statuses,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
    return apiJson(result ?? { range: parsed.data.range ?? "today", items: [], nextCursor: null }, limit);
  });
}
