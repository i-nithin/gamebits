import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import { cacheUploadUrl, fileFingerprint, getCachedUploadUrl } from "@/lib/game-draft";

const inflight = new Map<string, Promise<string>>();

async function putToR2(file: File, purpose: "logo" | "media") {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 8MB or smaller");
  }

  const tokenRes = await fetch("/api/uploads/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType: file.type }),
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
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploaded.ok) {
    throw new Error("Upload failed");
  }
  return token.deliveryUrl;
}

export async function uploadImage(file: File, purpose: "logo" | "media") {
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
