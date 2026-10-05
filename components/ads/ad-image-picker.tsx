"use client";

import { useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { isCarouselVideo } from "@/lib/ads-types";
import { ACCEPTED_CLIP_TYPES, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { uploadCarouselMedia, uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");
const CAROUSEL_ACCEPT = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_CLIP_TYPES].join(",");

export function AdImagePicker({
  value,
  onChange,
  onBusyChange,
  variant,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
  variant: "logo" | "media" | "carousel";
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = useRef(false);

  const label = variant === "logo" ? "logo" : variant === "carousel" ? "media" : "image";
  const video = variant === "carousel" && value ? isCarouselVideo(value) : false;

  function setUploadBusy(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  async function handleFile(file: File) {
    if (uploading.current) return;
    uploading.current = true;
    setUploadBusy(true);
    setError(null);
    try {
      onChange(variant === "carousel" ? await uploadCarouselMedia(file) : await uploadImage(file, "ad"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      uploading.current = false;
      setUploadBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-iron bg-obsidian px-6 text-center transition-colors",
          variant === "logo" ? "min-h-44 py-8" : "min-h-52 py-8",
          variant === "carousel" && "min-h-64",
          (over || busy) && "border-ice-signal bg-ice-soft/30",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (busy) return;
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--gb-ice-soft),transparent_68%)]"
        />
        {value ? (
          video ? (
            <video
              src={value}
              muted
              playsInline
              loop
              autoPlay
              className="relative h-40 w-full max-w-md rounded-2xl object-cover card-ring"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className={cn(
                "relative object-contain card-ring",
                variant === "logo"
                  ? "size-16 rounded-xl"
                  : variant === "carousel"
                    ? "h-40 w-full max-w-md rounded-2xl object-cover"
                    : "h-[108px] w-full max-w-[280px] rounded-2xl",
              )}
            />
          )
        ) : (
          <UploadIcon className="relative size-8 text-fog" strokeWidth={1.5} />
        )}
        <p className="relative mt-4 text-sm text-paper-white">
          {busy ? "Uploading…" : value ? `Replace ${label}` : `Upload ${label}`}
        </p>
        <div className="relative mt-2 flex flex-col gap-0.5 text-xs text-fog">
          <span>
            {variant === "logo"
              ? "512×512 square"
              : variant === "carousel"
                ? "Wide image, GIF, or short video"
                : "640×216 wide"}
          </span>
          <span>
            {variant === "carousel"
              ? "PNG, WebP, GIF, JPEG · 8MB, or MP4, WebM · 12MB"
              : "PNG, WebP, GIF, or JPEG · 2MB"}
          </span>
        </div>
        <input
          type="file"
          accept={variant === "carousel" ? CAROUSEL_ACCEPT : ACCEPT}
          disabled={busy}
          aria-label={value ? `Replace ad ${label}` : `Upload ad ${label}`}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:pointer-events-none"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        {value ? (
          <button
            type="button"
            aria-label={`Remove ad ${label}`}
            disabled={busy}
            className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-void/80 text-paper-white hover:bg-void disabled:opacity-50"
            onClick={() => {
              setError(null);
              onChange("");
            }}
          >
            <Trash2Icon className="size-3.5" />
          </button>
        ) : null}
        {busy ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/70">
            <Spinner className="size-5 text-paper-white" />
          </div>
        ) : null}
        {value && !busy ? (
          <span className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-void/80 px-2.5 py-1 text-xs text-paper-white">
            <ImageUpIcon className="size-3.5" />
            Change
          </span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
