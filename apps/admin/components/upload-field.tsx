"use client";

import { useState } from "react";

import { MAX_IMAGE_BYTES, PLATFORM_LOGO_TYPES, ACCEPTED_IMAGE_TYPES } from "@gamebits/core/constants";

async function uploadFile(file: File, purpose: "logo" | "media" | "platform") {
  const type = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  const contentType =
    purpose === "platform" && (type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg"))
      ? "image/svg+xml"
      : type;
  const allowed = purpose === "platform" ? PLATFORM_LOGO_TYPES : ACCEPTED_IMAGE_TYPES;
  if (!(allowed as readonly string[]).includes(contentType)) {
    throw new Error("Unsupported image type");
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 8MB or smaller");

  const tokenRes = await fetch("/api/uploads/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType }),
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
  return token.deliveryUrl;
}

export function UploadField({
  name,
  label,
  purpose,
  value,
  onChange,
}: {
  name: string;
  label: string;
  purpose: "logo" | "media" | "platform";
  value: string;
  onChange: (url: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-fog">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-12 rounded-lg bg-graphite object-contain" />
        ) : (
          <div className="size-12 rounded-lg bg-graphite" />
        )}
        <input
          type="file"
          accept={purpose === "platform" ? "image/*,.svg" : "image/jpeg,image/png,image/webp,image/gif"}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              onChange(await uploadFile(file, purpose));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setBusy(false);
            }
          }}
          className="text-xs text-fog"
        />
      </div>
      {busy ? <span className="text-xs text-fog">Uploading…</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
