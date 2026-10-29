import { withApiKey } from "@/lib/api/auth";
import { readGame } from "@/lib/api/catalog";
import { apiInvalid, apiJson, apiNotFound } from "@/lib/api/http";
import { gameSlugParam } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return withApiKey(request, async (limit) => {
    const params = await context.params;
    const parsed = gameSlugParam.safeParse({ slug: params.slug.toLowerCase() });
    if (!parsed.success) return apiInvalid();
    const game = await readGame(parsed.data.slug);
    if (!game) return apiNotFound("Game not found");
    return apiJson(game, limit);
  });
}
