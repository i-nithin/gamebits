import { withApiKey } from "@/lib/api/auth";
import { readProfile } from "@/lib/api/catalog";
import { apiInvalid, apiJson, apiNotFound } from "@/lib/api/http";
import { handleParam } from "@/lib/api/params";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ handle: string }> }) {
  return withApiKey(request, async (limit) => {
    const params = await context.params;
    const parsed = handleParam.safeParse(params);
    if (!parsed.success) return apiInvalid();
    const profile = await readProfile(parsed.data.handle);
    if (!profile) return apiNotFound("Profile not found");
    return apiJson(profile, limit);
  });
}
