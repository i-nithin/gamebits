import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { PLATFORM_LOGO_TYPES } from "@/lib/constants";

const EXT_BY_TYPE: Record<(typeof PLATFORM_LOGO_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function trimPublicUrl(raw: string) {
  return raw.replace(/\/+$/, "");
}

export function r2PublicBaseUrl() {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    return trimPublicUrl(parsed.toString());
  } catch {
    return null;
  }
}

export function r2PublicHostname() {
  const base = r2PublicBaseUrl();
  if (!base) return null;
  return new URL(base).hostname;
}

export function r2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      r2PublicBaseUrl(),
  );
}

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function createPresignedUpload(opts: {
  userId: string;
  purpose: "logo" | "media" | "platform";
  contentType: (typeof PLATFORM_LOGO_TYPES)[number];
}) {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = r2PublicBaseUrl();
  if (!bucket || !publicBase) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const ext = EXT_BY_TYPE[opts.contentType];
  const folder = opts.purpose === "platform" ? "platforms" : `games/${opts.purpose}`;
  const key = `${folder}/${opts.userId}/${randomUUID()}.${ext}`;
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: opts.contentType,
  });

  const uploadURL = await getSignedUrl(client, command, { expiresIn: 300 });
  return {
    key,
    uploadURL,
    deliveryUrl: `${publicBase}/${key}`,
  };
}
