import {
  ACCEPTED_CLIP_TYPES,
  ACCEPTED_IMAGE_TYPES,
  MAX_AD_IMAGE_BYTES,
  MAX_CAROUSEL_VIDEO_BYTES,
  MAX_CLIP_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import { cacheUploadUrl, fileFingerprint, getCachedUploadUrl } from "@/lib/game-draft";

const inflight = new Map<string, Promise<string>>();

type UploadPurpose = "logo" | "media" | "platform" | "avatar" | "cover" | "ad" | "carousel" | "clip";

type UploadTicket = {
  error?: string;
  key?: string;
  uploadURL?: string;
  deliveryUrl?: string;
};

async function putAndVerify(file: File, contentType: string, purpose: UploadPurpose) {
  const tokenRes = await fetch("/api/uploads/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType, contentLength: file.size }),
  });
  const token = (await tokenRes.json()) as UploadTicket;
  if (!tokenRes.ok || !token.uploadURL || !token.deliveryUrl || !token.key) {
    throw new Error(token.error ?? "Could not start upload");
  }

  const uploaded = await fetch(token.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!uploaded.ok) throw new Error("Upload failed");

  const verified = await fetch("/api/uploads/r2/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: token.key, purpose }),
  });
  if (!verified.ok) throw new Error("Upload failed");
  return token.deliveryUrl;
}

function contentTypeFor(file: File) {
  const type = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)) return type;
  return null;
}

async function putToR2(file: File, purpose: UploadPurpose) {
  const contentType = contentTypeFor(file);
  if (!contentType) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  const maxBytes = purpose === "ad" ? MAX_AD_IMAGE_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      purpose === "ad" ? "Ad images must be 2MB or smaller" : "Images must be 8MB or smaller",
    );
  }

  return putAndVerify(file, contentType, purpose);
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

export async function uploadCarouselMedia(file: File) {
  const contentType = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!(ACCEPTED_CLIP_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("Only MP4 and WebM videos are allowed");
  }
  if (file.size > MAX_CAROUSEL_VIDEO_BYTES) {
    throw new Error("Videos must be 12MB or smaller");
  }

  const fingerprint = fileFingerprint(file);
  const cached = getCachedUploadUrl(fingerprint);
  if (cached) return cached;

  const pending = inflight.get(fingerprint);
  if (pending) return pending;

  const request = putAndVerify(file, contentType, "carousel")
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

  const request = putAndVerify(file, contentType, "clip")
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
