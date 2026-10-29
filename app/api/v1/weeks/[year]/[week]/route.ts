import { withApiKey } from "@/lib/api/auth";
import { readWeek } from "@/lib/api/catalog";
import { apiInvalid, apiJson } from "@/lib/api/http";
import { weekParams } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ year: string; week: string }> }) {
  return withApiKey(request, async (limit) => {
    const params = await context.params;
    const parsed = weekParams.safeParse(params);
    if (!parsed.success) return apiInvalid();
    const board = await readWeek(parsed.data.year, parsed.data.week);
    return apiJson(board, limit);
  });
}
