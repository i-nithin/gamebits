import { readCurrentWeek } from "@/lib/api/catalog";
import { apiJson } from "@/lib/api/http";
import { withApiKey } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiKey(request, async (limit) => {
    const board = await readCurrentWeek();
    return apiJson(board, limit);
  });
}
