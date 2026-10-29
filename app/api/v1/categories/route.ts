import { withApiKey } from "@/lib/api/auth";
import { readCategories } from "@/lib/api/catalog";
import { apiJson } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async (limit) => {
    const result = await readCategories();
    return apiJson(result ?? { items: [] }, limit);
  });
}
