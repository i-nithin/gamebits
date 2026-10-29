import { withApiKey } from "@/lib/api/auth";
import { readCatalog } from "@/lib/api/catalog";
import { apiInvalid, apiJson } from "@/lib/api/http";
import { catalogQuery, readFilters, readPage } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async (limit) => {
    const url = new URL(request.url);
    const page = readPage(url);
    const filters = readFilters(url);
    const parsed = catalogQuery.safeParse({
      ...(url.searchParams.get("sort") ? { sort: url.searchParams.get("sort") } : {}),
      ...(url.searchParams.get("dir") ? { dir: url.searchParams.get("dir") } : {}),
      ...(page?.cursor ? { cursor: page.cursor } : {}),
      ...(page?.limit ? { limit: page.limit } : {}),
    });
    if (!page || !filters || !parsed.success) return apiInvalid();
    const result = await readCatalog({
      sort: parsed.data.sort ?? "newest",
      dir: parsed.data.dir,
      platforms: filters.platforms,
      categories: filters.categories,
      statuses: filters.statuses,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
    return apiJson(result ?? { items: [], nextCursor: null }, limit);
  });
}
