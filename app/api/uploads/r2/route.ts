import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminUserId, requireSignedIn } from "@/lib/auth-admin";
import { ACCEPTED_IMAGE_TYPES, PLATFORM_LOGO_TYPES } from "@/lib/constants";
import { createPresignedUpload, r2Configured } from "@/lib/cloudflare-r2";

const bodySchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.enum(["logo", "media"]),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
  }),
  z.object({
    purpose: z.literal("platform"),
    contentType: z.enum(PLATFORM_LOGO_TYPES),
  }),
]);

export async function POST(request: Request) {
  try {
    const userId = await requireSignedIn();
    if (!r2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 is not configured" },
        { status: 503 },
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.purpose === "platform" && !isAdminUserId(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upload = await createPresignedUpload({
      userId,
      purpose: parsed.data.purpose,
      contentType: parsed.data.contentType,
    });
    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
