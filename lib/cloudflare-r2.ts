import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ACCEPTED_CLIP_TYPES, PLATFORM_LOGO_TYPES } from "@/lib/constants";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

type UploadContentType = (typeof PLATFORM_LOGO_TYPES)[number] | (typeof ACCEPTED_CLIP_TYPES)[number];

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

export function uploadKeyPrefix(
  purpose: "logo" | "media" | "platform" | "avatar" | "cover" | "ad" | "carousel" | "clip",
  userId: string,
) {
  const folder =
    purpose === "platform"
      ? "platforms"
      : purpose === "ad" || purpose === "carousel"
        ? "ads"
        : purpose === "avatar" || purpose === "cover"
          ? `profiles/${purpose}`
          : `games/${purpose}`;
  return `${folder}/${userId}/`;
}

export async function createPresignedUpload(opts: {
  userId: string;
  purpose: "logo" | "media" | "platform" | "avatar" | "cover" | "ad" | "carousel" | "clip";
  contentType: UploadContentType;
  contentLength: number;
}) {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = r2PublicBaseUrl();
  if (!bucket || !publicBase) {
    throw new Error("Cloudflare R2 is not configured");
  }

  const ext = EXT_BY_TYPE[opts.contentType];
  if (!ext) throw new Error("Unsupported file type");
  const key = `${uploadKeyPrefix(opts.purpose, opts.userId)}${randomUUID()}.${ext}`;
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.contentLength,
  });

  const uploadURL = await getSignedUrl(client, command, { expiresIn: 300 });
  return {
    key,
    uploadURL,
    deliveryUrl: `${publicBase}/${key}`,
  };
}

const OWNED_KEY =
  /^(platforms|ads|profiles\/(?:avatar|cover)|games\/(?:logo|media|clip))\/([^/]+)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp|mp4|webm)$/i;

function ascii(bytes: Uint8Array, start: number, end: number) {
  return Buffer.from(bytes.subarray(start, end)).toString("ascii");
}

function matchesMagic(ext: string, bytes: Uint8Array) {
  switch (ext) {
    case "jpg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "png":
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case "gif":
      return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
    case "webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "mp4":
      return Buffer.from(bytes).toString("latin1").includes("ftyp");
    case "webm":
      return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    default:
      return false;
  }
}

export function keyFromDeliveryUrl(raw: string) {
  const base = r2PublicBaseUrl();
  if (!base) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  const root = new URL(base);
  if (parsed.origin !== root.origin) return null;
  const prefix = `${root.pathname.replace(/\/$/, "")}/`;
  if (!parsed.pathname.startsWith(prefix)) return null;
  const key = decodeURIComponent(parsed.pathname.slice(prefix.length));
  if (!key || key.includes("..") || key.startsWith("/")) return null;
  return key;
}

async function deleteObject(key: string) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return;
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function inspectOwnedObject(opts: { key: string; userIds: string[]; maxBytes: number }) {
  const match = OWNED_KEY.exec(opts.key);
  if (!match || !opts.userIds.includes(match[2])) return false;
  const ext = match[3].toLowerCase();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return false;

  const client = getR2Client();
  let length = 0;
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: opts.key }));
    length = head.ContentLength ?? 0;
  } catch {
    return false;
  }

  const reject = async () => {
    await deleteObject(opts.key);
    return false;
  };

  if (length <= 0 || length > opts.maxBytes) return reject();

  try {
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: opts.key, Range: "bytes=0-31" }),
    );
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes || !matchesMagic(ext, bytes)) return reject();
  } catch {
    return reject();
  }

  return true;
}

export async function confirmNewR2Object(opts: {
  url: string;
  userIds: string[];
  maxBytes: number;
  keptUrls?: ReadonlySet<string>;
}) {
  if (opts.keptUrls?.has(opts.url)) return true;
  const key = keyFromDeliveryUrl(opts.url);
  if (!key) return true;
  return inspectOwnedObject({ key, userIds: opts.userIds, maxBytes: opts.maxBytes });
}
