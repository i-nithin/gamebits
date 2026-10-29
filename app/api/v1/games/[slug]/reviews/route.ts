import { withApiKey } from "@/lib/api/auth";
import { readGameReviews } from "@/lib/api/catalog";
import { apiInvalid, apiJson, apiNotFound } from "@/lib/api/http";
import { gameSlugParam, readPage } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return withApiKey(request, async (limit) => {
    const params = await context.params;
    const parsed = gameSlugParam.safeParse({ slug: params.slug.toLowerCase() });
    const page = readPage(new URL(request.url));
    if (!parsed.success || !page) return apiInvalid();
    const reviews = await readGameReviews(parsed.data.slug, page.cursor, page.limit);
    if (!reviews) return apiNotFound("Game not found");
    return apiJson(reviews, limit);
  });
}
