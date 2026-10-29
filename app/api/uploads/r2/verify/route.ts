import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminAccess, requireSignedIn } from "@/lib/auth-admin";
import { inspectOwnedObject, r2Configured, uploadKeyPrefix } from "@/lib/cloudflare-r2";
import {
  MAX_AD_IMAGE_BYTES,
  MAX_CAROUSEL_VIDEO_BYTES,
  MAX_CLIP_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  key: z.string().min(1).max(300),
  purpose: z.enum(["logo", "media", "avatar", "cover", "platform", "ad", "carousel", "clip"]),
});

function maxBytes(purpose: z.infer<typeof bodySchema>["purpose"]) {
  if (purpose === "clip") return MAX_CLIP_BYTES;
  if (purpose === "carousel") return MAX_CAROUSEL_VIDEO_BYTES;
  if (purpose === "ad") return MAX_AD_IMAGE_BYTES;
  return MAX_IMAGE_BYTES;
}

export async function POST(request: Request) {
  try {
    const userId = await requireSignedIn();
    const limit = await rateLimit("upload", userId);
    if (limit !== "ok") return rateLimitResponse(limit);
    if (!r2Configured()) {
      return NextResponse.json({ error: "Cloudflare R2 is not configured" }, { status: 503 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { key, purpose } = parsed.data;
    if (purpose === "platform" && !(await getAdminAccess(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (key.includes("..") || !key.startsWith(uploadKeyPrefix(purpose, userId))) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const video = /\.(mp4|webm)$/i.test(key);
    if ((purpose === "clip" || purpose === "carousel") && !video) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (purpose !== "clip" && purpose !== "carousel" && video) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ok = await inspectOwnedObject({
      key,
      userIds: [userId],
      maxBytes: maxBytes(purpose),
    });
    if (!ok) return NextResponse.json({ error: "Upload failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[uploads] verify failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
