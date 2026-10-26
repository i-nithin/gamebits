"use client";

import { useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { isCarouselVideo } from "@/lib/ads-types";
import { ACCEPTED_CLIP_TYPES, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { uploadCarouselMedia, uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");
const CAROUSEL_ACCEPT = ACCEPTED_CLIP_TYPES.join(",");

export function useAdUpload(
  variant: "logo" | "media" | "carousel",
  onChange: (url: string) => void,
  onBusyChange?: (busy: boolean) => void,
) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = useRef(false);
  const accept = variant === "carousel" ? CAROUSEL_ACCEPT : ACCEPT;

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

  return {
    busy,
    over,
    error,
    accept,
    clear() {
      setError(null);
      onChange("");
    },
    onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void handleFile(file);
    },
    drag: {
      onDragEnter(event: React.DragEvent) {
        event.preventDefault();
        if (!busy) setOver(true);
      },
      onDragOver(event: React.DragEvent) {
        event.preventDefault();
        if (!busy) setOver(true);
      },
      onDragLeave() {
        setOver(false);
      },
      onDrop(event: React.DragEvent) {
        event.preventDefault();
        setOver(false);
        if (busy) return;
        const file = event.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      },
    },
  };
}

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
  const upload = useAdUpload(variant, onChange, onBusyChange);
  const label = variant === "logo" ? "logo" : variant === "carousel" ? "video" : "image";
  const video = variant === "carousel" && value ? isCarouselVideo(value) : false;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-iron bg-obsidian px-6 text-center transition-colors",
          variant === "logo" ? "min-h-44 py-8" : "min-h-52 py-8",
          variant === "carousel" && "min-h-64",
          (upload.over || upload.busy) && "border-ice-signal bg-ice-soft/30",
        )}
        {...upload.drag}
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
          {upload.busy ? "Uploading…" : value ? `Replace ${label}` : `Upload ${label}`}
        </p>
        <div className="relative mt-2 flex flex-col gap-0.5 text-xs text-fog">
          <span>
            {variant === "logo" ? "512×512 square" : variant === "carousel" ? "Short video" : "640×216 wide"}
          </span>
          <span>
            {variant === "carousel" ? "MP4 or WebM · 12MB" : "PNG, WebP, GIF, or JPEG · 2MB"}
          </span>
        </div>
        <input
          type="file"
          accept={upload.accept}
          disabled={upload.busy}
          aria-label={value ? `Replace ad ${label}` : `Upload ad ${label}`}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:pointer-events-none"
          onChange={upload.onInputChange}
        />
        {value ? (
          <button
            type="button"
            aria-label={`Remove ad ${label}`}
            disabled={upload.busy}
            className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-void/80 text-paper-white hover:bg-void disabled:opacity-50"
            onClick={upload.clear}
          >
            <Trash2Icon className="size-3.5" />
          </button>
        ) : null}
        {upload.busy ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/70">
            <Spinner className="size-5 text-paper-white" />
          </div>
        ) : null}
        {value && !upload.busy ? (
          <span className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-void/80 px-2.5 py-1 text-xs text-paper-white">
            <ImageUpIcon className="size-3.5" />
            Change
          </span>
        ) : null}
      </div>
      {upload.error ? <p className="text-sm text-error">{upload.error}</p> : null}
    </div>
  );
}
