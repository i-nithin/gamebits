import {
  ACCEPTED_CLIP_TYPES,
  ACCEPTED_IMAGE_TYPES,
  MAX_AD_IMAGE_BYTES,
  MAX_CLIP_BYTES,
  MAX_IMAGE_BYTES,
  PLATFORM_LOGO_TYPES,
} from "@/lib/constants";
import { cacheUploadUrl, fileFingerprint, getCachedUploadUrl } from "@/lib/game-draft";

const inflight = new Map<string, Promise<string>>();

type UploadPurpose = "logo" | "media" | "platform" | "avatar" | "cover" | "ad";

function contentTypeFor(file: File, purpose: UploadPurpose) {
  const type = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (purpose === "platform" && (type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))) {
    return "image/svg+xml";
  }
  const allowed = purpose === "platform" ? PLATFORM_LOGO_TYPES : ACCEPTED_IMAGE_TYPES;
  if ((allowed as readonly string[]).includes(type)) return type;
  return null;
}

async function putToR2(file: File, purpose: UploadPurpose) {
  const contentType = contentTypeFor(file, purpose);
  if (!contentType) {
    throw new Error(
      purpose === "platform"
        ? "Use a PNG, WebP, GIF, JPEG, or SVG icon"
        : "Only JPEG, PNG, WebP, and GIF images are allowed",
    );
  }
  const maxBytes = purpose === "ad" ? MAX_AD_IMAGE_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      purpose === "ad" ? "Ad images must be 2MB or smaller" : "Images must be 8MB or smaller",
    );
  }

  const tokenRes = await fetch("/api/uploads/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType, contentLength: file.size }),
  });
  const token = (await tokenRes.json()) as {
    error?: string;
    uploadURL?: string;
    deliveryUrl?: string;
  };
  if (!tokenRes.ok || !token.uploadURL || !token.deliveryUrl) {
    throw new Error(token.error ?? "Could not start upload");
  }

  const uploaded = await fetch(token.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!uploaded.ok) {
    throw new Error("Upload failed");
  }
  return token.deliveryUrl;
}

export async function uploadImage(file: File, purpose: UploadPurpose) {
  const fingerprint = fileFingerprint(file);
  const cached = getCachedUploadUrl(fingerprint);
  if (cached) return cached;

  const pending = inflight.get(fingerprint);
  if (pending) return pending;

  const request = putToR2(file, purpose)
    .then((url) => {
      cacheUploadUrl(fingerprint, url);
      return url;
    })
    .finally(() => {
      inflight.delete(fingerprint);
    });

  inflight.set(fingerprint, request);
  return request;
}

export async function uploadClip(file: File) {
  const contentType = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!(ACCEPTED_CLIP_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("Only MP4 and WebM clips are allowed");
  }
  if (file.size > MAX_CLIP_BYTES) {
    throw new Error("Clips must be 4MB or smaller");
  }

  const fingerprint = fileFingerprint(file);
  const cached = getCachedUploadUrl(fingerprint);
  if (cached) return cached;

  const pending = inflight.get(fingerprint);
  if (pending) return pending;

  const request = (async () => {
    const tokenRes = await fetch("/api/uploads/r2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "clip", contentType, contentLength: file.size }),
    });
    const token = (await tokenRes.json()) as {
      error?: string;
      uploadURL?: string;
      deliveryUrl?: string;
    };
    if (!tokenRes.ok || !token.uploadURL || !token.deliveryUrl) {
      throw new Error(token.error ?? "Could not start upload");
    }
    const uploaded = await fetch(token.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!uploaded.ok) throw new Error("Upload failed");
    cacheUploadUrl(fingerprint, token.deliveryUrl);
    return token.deliveryUrl;
  })().finally(() => {
    inflight.delete(fingerprint);
  });

  inflight.set(fingerprint, request);
  return request;
}
