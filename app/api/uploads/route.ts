import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image" }, { status: 400 });
  }
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be 8MB or smaller" }, { status: 400 });
  }

  const ext = EXTENSIONS[file.type] ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ deliveryUrl: `/uploads/${filename}` });
}
