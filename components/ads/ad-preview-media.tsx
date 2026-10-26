"use client";

import { useRef } from "react";
import { PencilIcon, Trash2Icon, VideoIcon } from "lucide-react";

import { BrandAdCard } from "@/components/ads/ad-card";
import { CarouselSlide, type CarouselSlideData } from "@/components/ads/carousel-slide";
import { useAdUpload } from "@/components/ads/ad-image-picker";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function UploadInput({
  inputRef,
  accept,
  busy,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  busy: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      disabled={busy}
      className="sr-only"
      onChange={onChange}
    />
  );
}

export function SidebarLogoPreview({
  logoUrl,
  productName,
  tagline,
  onChange,
  onBusyChange,
}: {
  logoUrl: string;
  productName: string;
  tagline: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const upload = useAdUpload("logo", onChange, onBusyChange);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div>
      <div className="relative w-full max-w-[320px]">
        <BrandAdCard
          ad={{
            logoUrl: logoUrl || null,
            productName: productName.trim() || "Product name",
            tagline: tagline.trim() || "One line about the product",
          }}
          className="w-full"
        />
        <div
          className={cn(
            "absolute top-4 left-4 size-14 rounded-md",
            !logoUrl && "cursor-pointer",
            upload.over && "ring-2 ring-ice-signal",
          )}
          {...upload.drag}
          onClick={() => {
            if (!logoUrl && !upload.busy) openPicker();
          }}
        >
          <button
            type="button"
            aria-label={logoUrl ? "Replace logo" : "Upload logo"}
            disabled={upload.busy}
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="absolute -right-1 -bottom-1 z-20 flex size-7 items-center justify-center rounded-full border border-iron bg-graphite text-paper-white disabled:opacity-50"
          >
            <PencilIcon className="size-3.5" />
          </button>
          {logoUrl ? (
            <button
              type="button"
              aria-label="Remove logo"
              disabled={upload.busy}
              onClick={(event) => {
                event.stopPropagation();
                upload.clear();
              }}
              className="absolute -top-1 -right-1 z-20 flex size-6 items-center justify-center rounded-full bg-void/85 text-paper-white disabled:opacity-50"
            >
              <Trash2Icon className="size-3" />
            </button>
          ) : null}
          {upload.busy ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-void/70">
              <Spinner className="size-4 text-paper-white" />
            </div>
          ) : null}
        </div>
      </div>
      <UploadInput
        inputRef={inputRef}
        accept={upload.accept}
        busy={upload.busy}
        onChange={upload.onInputChange}
      />
      {upload.error ? <p className="mt-2 text-sm text-error">{upload.error}</p> : null}
      <p className="mt-2 text-xs text-fog">512×512 square. PNG, WebP, GIF, or JPEG · 2MB.</p>
    </div>
  );
}

export function CarouselMediaPreview({
  slide,
  onChange,
  onBusyChange,
}: {
  slide: CarouselSlideData;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const upload = useAdUpload("carousel", onChange, onBusyChange);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = slide.mediaUrl;

  function openPicker() {
    inputRef.current?.click();
  }

  const actionButton =
    "inline-flex h-8 items-center gap-1.5 rounded-full border border-iron bg-obsidian px-3 text-xs text-paper-white disabled:opacity-50";

  return (
    <div>
      {value ? (
        <div
          className={cn(
            "relative aspect-[16/9] w-full overflow-hidden rounded-md border border-iron",
            upload.over && "ring-2 ring-ice-signal",
          )}
          {...upload.drag}
        >
          <CarouselSlide slide={slide} />
          {upload.busy ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/70">
              <Spinner className="size-5 text-paper-white" />
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={upload.busy}
          onClick={openPicker}
          className={cn(
            "flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-iron bg-page px-6 text-center",
            upload.over && "border-ice-signal bg-graphite",
          )}
          {...upload.drag}
        >
          {upload.busy ? (
            <Spinner className="size-5 text-fog" />
          ) : (
            <>
              <span className="flex size-10 items-center justify-center rounded-full border border-iron bg-obsidian text-paper-white">
                <VideoIcon className="size-5" />
              </span>
              <span className="text-sm font-medium text-paper-white">Upload a video</span>
              <span className="max-w-sm text-xs text-fog">
                Drop a file here, or click to choose one. MP4 or WebM up to 12MB.
              </span>
            </>
          )}
        </button>
      )}
      {value ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={upload.busy} onClick={openPicker} className={actionButton}>
            <PencilIcon className="size-3.5" />
            Replace
          </button>
          <button type="button" disabled={upload.busy} onClick={upload.clear} className={actionButton}>
            <Trash2Icon className="size-3.5" />
            Remove
          </button>
        </div>
      ) : null}
      <UploadInput
        inputRef={inputRef}
        accept={upload.accept}
        busy={upload.busy}
        onChange={upload.onInputChange}
      />
      {upload.error ? <p className="mt-2 text-sm text-error">{upload.error}</p> : null}
      {value ? (
        <p className="mt-2 text-xs text-fog">MP4 or WebM · 12MB.</p>
      ) : null}
    </div>
  );
}
