"use client";

import { useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { VideoThumbnail } from "@/components/game/video-thumbnail";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_IMAGE_TYPES,
  GAME_MEDIA_CAP,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";
import { parseVideoEmbed, withVideosFirst } from "@/lib/urls";
import { cn } from "@/lib/utils";

export type DraftMedia = {
  key: string;
  kind: "image" | "video";
  url: string;
};

async function uploadImage(file: File) {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 8MB or smaller");
  }

  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body });
  const payload = (await res.json()) as { error?: string; deliveryUrl?: string };
  if (!res.ok || !payload.deliveryUrl) {
    throw new Error(payload.error ?? "Could not start upload");
  }
  return payload.deliveryUrl;
}

function DropzoneFrame({
  children,
  className,
  active,
  onClick,
  onFile,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  onFile?: (file: File) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onDragEnter={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file && onFile) onFile(file);
      }}
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-iron bg-graphite text-center transition-colors",
        (over || active) && "border-ice-signal bg-ice-soft/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function LogoPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-paper-white">Game logo</span>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl card-ring bg-graphite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-void/70 p-1">
              <button
                type="button"
                aria-label="Replace logo"
                className="flex size-6 items-center justify-center rounded-md text-paper-white hover:bg-slate"
                onClick={() => inputRef.current?.click()}
              >
                <ImageUpIcon className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remove logo"
                className="flex size-6 items-center justify-center rounded-md text-paper-white hover:bg-slate"
                onClick={() => onChange("")}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <DropzoneFrame
            className="size-16 shrink-0 rounded-xl p-2"
            onClick={() => inputRef.current?.click()}
            onFile={handleFile}
          >
            <UploadIcon className="size-5 text-fog" strokeWidth={1.5} />
          </DropzoneFrame>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm text-paper-white">
            <span className="text-ice-signal">Click to upload</span>
            <span className="text-fog"> or drag and drop</span>
          </p>
          <p className="text-xs text-fog">
            {busy ? "Uploading…" : "JPEG, PNG, WebP, or GIF · max 8 MB"}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          await handleFile(file);
        }}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

function MediaPreview({ item, compact = false }: { item: DraftMedia; compact?: boolean }) {
  if (item.kind === "video") {
    return <VideoThumbnail url={item.url} compact={compact} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="" className="size-full object-cover" />
  );
}

export function MediaPicker({
  items,
  onChange,
}: {
  items: DraftMedia[];
  onChange: (items: DraftMedia[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceKeyRef = useRef<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(items[0]?.key ?? null);
  const full = items.length >= GAME_MEDIA_CAP;
  const selected = items.find((item) => item.key === selectedKey) ?? items[0];

  function commit(next: DraftMedia[], selectKey?: string) {
    const ordered = withVideosFirst(next).slice(0, GAME_MEDIA_CAP);
    onChange(ordered);
    if (selectKey) setSelectedKey(selectKey);
  }

  function addVideoFromUrl(raw: string) {
    const parsed = parseVideoEmbed(raw);
    if (!parsed) return false;
    if (items.some((item) => item.kind === "video" && item.url === parsed.watchUrl)) {
      setVideoUrl("");
      setError(null);
      return true;
    }
    if (full) {
      setError(`You can add up to ${GAME_MEDIA_CAP} media items`);
      return false;
    }
    const key = crypto.randomUUID();
    commit([...items, { key, kind: "video", url: parsed.watchUrl }], key);
    setVideoUrl("");
    setError(null);
    return true;
  }

  function openFilePicker(replaceKey: string | null) {
    replaceKeyRef.current = replaceKey;
    inputRef.current?.click();
  }

  async function handleFile(file: File, replaceKey?: string | null) {
    const targetKey = replaceKey ?? null;
    if (!targetKey && full) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      if (targetKey) {
        const next = items.map((item) =>
          item.key === targetKey ? { ...item, kind: "image" as const, url } : item,
        );
        commit(withVideosFirst(next), targetKey);
        return;
      }
      const key = crypto.randomUUID();
      const hasVideo = items.some((item) => item.kind === "video");
      commit([...items, { key, kind: "image", url }], hasVideo ? selected?.key : key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="text-sm font-medium text-paper-white">Media</span>
        <span className="text-xs text-fog">
          {items.length}/{GAME_MEDIA_CAP}
        </span>
      </div>

      {selected ? (
        <div
          className="group relative min-h-56 flex-1 overflow-hidden rounded-2xl bg-graphite card-ring md:min-h-0"
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file) return;
            if (selected.kind === "image") {
              void handleFile(file, selected.key);
            } else if (!full) {
              void handleFile(file);
            }
          }}
        >
          <MediaPreview item={selected} />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {selected.kind === "image" ? (
              <button
                type="button"
                aria-label="Replace media"
                className="flex size-8 items-center justify-center rounded-lg bg-void/70 text-paper-white hover:bg-void/90"
                onClick={() => openFilePicker(selected.key)}
              >
                <ImageUpIcon className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Remove media"
              className="flex size-8 items-center justify-center rounded-lg bg-void/70 text-paper-white hover:bg-void/90"
              onClick={() => {
                const next = items.filter((entry) => entry.key !== selected.key);
                commit(next, next[0]?.key);
              }}
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <DropzoneFrame
          className="min-h-56 flex-1 p-6 md:min-h-0"
          onClick={() => openFilePicker(null)}
          onFile={(file) => void handleFile(file)}
        >
          <UploadIcon className="mb-3 size-6 text-fog" strokeWidth={1.5} />
          <p className="text-sm">
            <span className="text-ice-signal">Click to upload</span>
            <span className="text-fog"> or drag and drop</span>
          </p>
          <p className="mt-1 text-xs text-fog">
            {busy ? "Uploading…" : "JPEG, PNG, WebP, or GIF · max 8 MB"}
          </p>
        </DropzoneFrame>
      )}

      {items.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {items.map((item) => {
            const active = item.key === selected?.key;
            return (
              <div
                key={item.key}
                draggable={item.kind === "image"}
                onDragStart={() => {
                  if (item.kind !== "image") return;
                  setDragKey(item.key);
                }}
                onDragEnd={() => setDragKey(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!dragKey || dragKey === item.key) return;
                  const from = items.findIndex((entry) => entry.key === dragKey);
                  const to = items.findIndex((entry) => entry.key === item.key);
                  if (from < 0 || to < 0) return;
                  const next = [...items];
                  const [removed] = next.splice(from, 1);
                  next.splice(to, 0, removed);
                  commit(next);
                  setDragKey(null);
                }}
                className={cn(
                  "group relative size-16 shrink-0 overflow-hidden rounded-xl",
                  item.kind === "image" && "cursor-grab active:cursor-grabbing",
                  active ? "ring-2 ring-ice-signal" : "card-ring opacity-80 hover:opacity-100",
                  dragKey === item.key && "opacity-40",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "size-full",
                    item.kind === "image" && "cursor-grab active:cursor-grabbing",
                  )}
                  onClick={() => setSelectedKey(item.key)}
                  aria-label={item.kind === "video" ? "Select video" : "Select image"}
                >
                  <MediaPreview item={item} compact />
                </button>
                <button
                  type="button"
                  aria-label="Remove media"
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-md bg-void/80 text-paper-white"
                  onClick={() => {
                    const next = items.filter((entry) => entry.key !== item.key);
                    commit(next, item.key === selected?.key ? next[0]?.key : selected?.key);
                  }}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </div>
            );
          })}
          {!full ? (
            <DropzoneFrame
              className="size-16 rounded-xl p-1"
              onClick={() => openFilePicker(null)}
              onFile={(file) => void handleFile(file)}
            >
              <UploadIcon className="size-4 text-fog" strokeWidth={1.5} />
            </DropzoneFrame>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const replaceKey = replaceKeyRef.current;
          replaceKeyRef.current = null;
          event.target.value = "";
          if (!file) return;
          if (!replaceKey && full) return;
          await handleFile(file, replaceKey);
        }}
      />

      <Input
        value={videoUrl}
        onChange={(event) => {
          const value = event.target.value;
          setVideoUrl(value);
          if (parseVideoEmbed(value)) addVideoFromUrl(value);
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (text && addVideoFromUrl(text)) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (!addVideoFromUrl(videoUrl)) {
            setError("Use a YouTube or Vimeo HTTPS link");
          }
        }}
        placeholder="Paste a YouTube or Vimeo URL"
        disabled={full}
        className="h-9 shrink-0 rounded-lg border-iron bg-graphite"
      />
      <p className="shrink-0 text-xs text-fog">
        Images upload here. Paste a trailer link to pin it first.
      </p>
      {error ? <p className="shrink-0 text-xs text-error">{error}</p> : null}
    </div>
  );
}
