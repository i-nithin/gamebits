"use client";

import { useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { PLATFORM_LOGO_TYPES } from "@/lib/constants";
import { uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const ACCEPT = [...PLATFORM_LOGO_TYPES, ".svg"].join(",");

export function PlatformLogoPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = useRef(false);

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
      onChange(await uploadImage(file, "platform"));
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
          "relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-iron bg-obsidian px-6 py-10 text-center transition-colors",
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="relative size-24 object-contain" />
        ) : (
          <UploadIcon className="relative size-8 text-fog" strokeWidth={1.5} />
        )}
        <p className="relative mt-4 text-sm text-paper-white">
          {busy ? "Uploading…" : value ? "Replace logo" : "Upload logo"}
        </p>
        <p className="relative mt-1 text-xs text-fog">
          Click or drop a PNG, WebP, GIF, JPEG, or SVG
        </p>
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          aria-label={value ? "Replace platform logo" : "Upload platform logo"}
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
            aria-label="Remove logo"
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
