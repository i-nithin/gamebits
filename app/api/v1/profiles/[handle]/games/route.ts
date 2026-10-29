import { withApiKey } from "@/lib/api/auth";
import { readProfileGames } from "@/lib/api/catalog";
import { apiInvalid, apiJson, apiNotFound } from "@/lib/api/http";
import { handleParam, readPage } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  return withApiKey(request, async (limit) => {
    const params = await context.params;
    const parsed = handleParam.safeParse(params);
    const page = readPage(new URL(request.url));
    if (!parsed.success || !page) return apiInvalid();
    const games = await readProfileGames(parsed.data.handle, page.cursor, page.limit);
    if (!games) return apiNotFound("Profile not found");
    return apiJson(games, limit);
  });
}
