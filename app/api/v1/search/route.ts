import { withApiKey } from "@/lib/api/auth";
import { readSearch } from "@/lib/api/catalog";
import { apiInvalid, apiJson } from "@/lib/api/http";
import { searchQuery } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async (limit) => {
    const url = new URL(request.url);
    const parsed = searchQuery.safeParse({
      q: url.searchParams.get("q") ?? "",
      scope: url.searchParams.get("scope") ?? "all",
      platform: url.searchParams.get("platform") ?? "",
    });
    if (!parsed.success) return apiInvalid();
    const result = await readSearch({
      q: parsed.data.q,
      scope: parsed.data.scope,
      platform: parsed.data.platform || null,
    });
    return apiJson(result ?? { games: [], people: [] }, limit);
  });
}
