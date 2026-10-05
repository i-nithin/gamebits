import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminAccess, requireSignedIn } from "@/lib/auth-admin";
import {
  ACCEPTED_CLIP_TYPES,
  ACCEPTED_IMAGE_TYPES,
  MAX_AD_IMAGE_BYTES,
  MAX_CAROUSEL_IMAGE_BYTES,
  MAX_CAROUSEL_VIDEO_BYTES,
  MAX_CLIP_BYTES,
  PLATFORM_LOGO_TYPES,
} from "@/lib/constants";
import { createPresignedUpload, r2Configured } from "@/lib/cloudflare-r2";

const bodySchema = z.discriminatedUnion("purpose", [
  z.object({
    purpose: z.enum(["logo", "media", "avatar", "cover"]),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
    contentLength: z.number().int().positive().optional(),
  }),
  z.object({
    purpose: z.literal("platform"),
    contentType: z.enum(PLATFORM_LOGO_TYPES),
    contentLength: z.number().int().positive().optional(),
  }),
  z.object({
    purpose: z.literal("ad"),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
    contentLength: z.number().int().positive().max(MAX_AD_IMAGE_BYTES),
  }),
  z.object({
    purpose: z.literal("carousel"),
    contentType: z.enum([...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_CLIP_TYPES]),
    contentLength: z.number().int().positive(),
  }),
  z.object({
    purpose: z.literal("clip"),
    contentType: z.enum(ACCEPTED_CLIP_TYPES),
    contentLength: z.number().int().positive().max(MAX_CLIP_BYTES),
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

    if (parsed.data.purpose === "platform" && !(await getAdminAccess(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (parsed.data.purpose === "carousel") {
      const video = (ACCEPTED_CLIP_TYPES as readonly string[]).includes(parsed.data.contentType);
      const max = video ? MAX_CAROUSEL_VIDEO_BYTES : MAX_CAROUSEL_IMAGE_BYTES;
      if (parsed.data.contentLength > max) {
        return NextResponse.json(
          { error: video ? "Videos must be 12MB or smaller" : "Images must be 8MB or smaller" },
          { status: 400 },
        );
      }
    }

    const upload = await createPresignedUpload({
      userId,
      purpose: parsed.data.purpose,
      contentType: parsed.data.contentType,
      contentLength: parsed.data.contentLength,
    });
    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
