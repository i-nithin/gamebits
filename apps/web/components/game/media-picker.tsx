"use client";

import { useEffect, useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon, UploadIcon } from "lucide-react";

import { InfoTip } from "@/components/game/field-info";
import { VideoThumbnail } from "@/components/game/video-thumbnail";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ACCEPTED_IMAGE_TYPES, GAME_MEDIA_CAP } from "@/lib/constants";
import { getCachedUploadUrl, fileFingerprint } from "@/lib/game-draft";
import { uploadImage } from "@/lib/image-upload";
import { parseVideoEmbed, withVideosFirst } from "@/lib/urls";
import { cn } from "@/lib/utils";

export type DraftMedia = {
  key: string;
  kind: "image" | "video";
  url: string;
};

function UploadOverlay({
  visible,
  label = "Uploading…",
}: {
  visible: boolean;
  label?: string;
}) {
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-void/70"
      aria-live="polite"
    >
      <Spinner className="size-5 text-paper-white" />
      <span className="text-xs text-paper-white">{label}</span>
    </div>
  );
}

function DropzoneFrame({
  children,
  className,
  active,
  disabled,
  onClick,
  onFile,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onFile?: (file: File) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = event.dataTransfer.files?.[0];
        if (file && onFile) onFile(file);
      }}
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-iron bg-graphite text-center transition-colors",
        (over || active) && "border-ice-signal bg-ice-soft/40",
        disabled && "pointer-events-none opacity-60",
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
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setUploadBusy(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  async function handleFile(file: File) {
    const fingerprint = fileFingerprint(file);
    const cached = getCachedUploadUrl(fingerprint);
    if (cached && cached === value) {
      setError("This image is already your logo");
      return;
    }

    setUploadBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, "logo"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      {value ? (
        <div className="group relative size-14 overflow-hidden rounded-xl card-ring bg-graphite sm:size-16">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="size-full"
            aria-label="Replace logo"
            disabled={busy}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full object-cover" />
          </button>
          <button
            type="button"
            aria-label="Remove logo"
            className="absolute top-1 right-1 z-20 flex size-5 items-center justify-center rounded-full bg-void/80 text-paper-white"
            onClick={() => onChange("")}
            disabled={busy}
          >
            <Trash2Icon className="size-3" />
          </button>
          <UploadOverlay visible={busy} />
        </div>
      ) : (
        <DropzoneFrame
          className="size-14 rounded-xl p-2 sm:size-16"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onFile={handleFile}
        >
          {busy ? (
            <Spinner className="size-5 text-fog" />
          ) : (
            <UploadIcon className="size-5 text-fog" strokeWidth={1.5} />
          )}
        </DropzoneFrame>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          await handleFile(file);
        }}
      />
      {error ? <p className="mt-1 text-[11px] text-error">{error}</p> : null}
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
  onBusyChange,
}: {
  items: DraftMedia[];
  onChange: (items: DraftMedia[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceKeyRef = useRef<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(items[0]?.key ?? null);
  const full = items.length >= GAME_MEDIA_CAP;
  const selected = items.find((item) => item.key === selectedKey) ?? items[0];

  useEffect(() => {
    if (selectedKey && items.some((item) => item.key === selectedKey)) return;
    setSelectedKey(items[0]?.key ?? null);
  }, [items, selectedKey]);

  function setUploadBusy(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  function commit(next: DraftMedia[], selectKey?: string) {
    const ordered = withVideosFirst(next).slice(0, GAME_MEDIA_CAP);
    onChange(ordered);
    if (selectKey) setSelectedKey(selectKey);
  }

  function removeItem(key: string) {
    const next = items.filter((entry) => entry.key !== key);
    commit(next, key === selected?.key ? next[0]?.key : selected?.key);
  }

  function addVideoFromUrl(raw: string) {
    const parsed = parseVideoEmbed(raw);
    if (!parsed) return false;
    const existing = items.find((item) => item.kind === "video");
    if (existing?.url === parsed.watchUrl) {
      setVideoUrl("");
      setError(null);
      setSelectedKey(existing.key);
      return true;
    }
    if (existing) {
      commit(
        items.map((item) =>
          item.key === existing.key ? { ...item, url: parsed.watchUrl } : item,
        ),
        existing.key,
      );
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

  async function handleFile(file: File, replaceKey?: string | null) {
    if (!replaceKey && full) return;
    const fingerprint = fileFingerprint(file);
    const cached = getCachedUploadUrl(fingerprint);
    const duplicate = items.find((item) => item.kind === "image" && item.url === cached);
    if (cached && duplicate && duplicate.key !== replaceKey) {
      setError("This image is already added");
      setSelectedKey(duplicate.key);
      return;
    }

    setUploadBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file, "media");
      const already = items.find((item) => item.kind === "image" && item.url === url);
      if (already && already.key !== replaceKey) {
        setError("This image is already added");
        setSelectedKey(already.key);
        return;
      }
      if (replaceKey) {
        commit(
          items.map((item) =>
            item.key === replaceKey ? { ...item, kind: "image", url } : item,
          ),
          replaceKey,
        );
        return;
      }
      const key = crypto.randomUUID();
      const hasVideo = items.some((item) => item.kind === "video");
      commit([...items, { key, kind: "image", url }], hasVideo ? selected?.key : key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
      replaceKeyRef.current = null;
    }
  }

  function openFilePicker(replaceKey?: string) {
    if (busy) return;
    replaceKeyRef.current = replaceKey ?? null;
    inputRef.current?.click();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex h-5 shrink-0 items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-paper-white">
          Media
          <InfoTip text="Trailers stay first. Paste a YouTube or Vimeo URL, then add up to 8 screenshots." />
        </span>
        <span className="text-xs text-fog">
          {busy ? "Uploading…" : `${items.length}/${GAME_MEDIA_CAP}`}
        </span>
      </div>

      {selected ? (
        <div
          className="group relative min-h-48 flex-1 overflow-hidden rounded-2xl bg-graphite card-ring sm:min-h-0"
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (busy) return;
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file, selected.kind === "image" ? selected.key : null);
          }}
        >
          <MediaPreview item={selected} />
          <div className="absolute top-3 right-3 z-20 flex gap-1.5">
            {selected.kind === "image" ? (
              <button
                type="button"
                aria-label="Replace image"
                className="flex size-8 items-center justify-center rounded-full bg-void/75 text-paper-white hover:bg-void disabled:opacity-50"
                onClick={() => openFilePicker(selected.key)}
                disabled={busy}
              >
                <ImageUpIcon className="size-3.5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Replace video"
                className="flex size-8 items-center justify-center rounded-full bg-void/75 text-paper-white hover:bg-void disabled:opacity-50"
                onClick={() => videoInputRef.current?.focus()}
                disabled={busy}
              >
                <ImageUpIcon className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Remove media"
              className="flex size-8 items-center justify-center rounded-full bg-void/75 text-paper-white hover:bg-void disabled:opacity-50"
              onClick={() => removeItem(selected.key)}
              disabled={busy}
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
          <UploadOverlay visible={busy} />
        </div>
      ) : (
        <DropzoneFrame
          className="min-h-48 flex-1 p-6 sm:min-h-0"
          disabled={busy}
          onClick={() => openFilePicker()}
          onFile={handleFile}
        >
          {busy ? (
            <>
              <Spinner className="mb-3 size-6 text-fog" />
              <p className="text-sm text-paper-white">Uploading…</p>
            </>
          ) : (
            <>
              <UploadIcon className="mb-3 size-6 text-fog" strokeWidth={1.5} />
              <p className="text-sm">
                <span className="text-ice-signal">Click to upload</span>
                <span className="text-fog"> or drag and drop</span>
              </p>
              <p className="mt-1 text-xs text-fog">JPEG, PNG, WebP, or GIF · max 8 MB</p>
            </>
          )}
        </DropzoneFrame>
      )}

      {items.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {items.map((item) => {
            const active = item.key === selected?.key;
            return (
              <div
                key={item.key}
                draggable={item.kind === "image" && !busy}
                onDragStart={() => {
                  if (item.kind !== "image" || busy) return;
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
                  "group relative size-14 shrink-0 overflow-hidden rounded-xl sm:size-16",
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
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-void/85 text-paper-white"
                  onClick={() => removeItem(item.key)}
                  disabled={busy}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </div>
            );
          })}
          {!full ? (
            <DropzoneFrame
              className="size-14 rounded-xl p-1 sm:size-16"
              disabled={busy}
              onClick={() => openFilePicker()}
              onFile={handleFile}
            >
              {busy ? (
                <Spinner className="size-4 text-fog" />
              ) : (
                <UploadIcon className="size-4 text-fog" strokeWidth={1.5} />
              )}
            </DropzoneFrame>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          const replaceKey = replaceKeyRef.current;
          event.target.value = "";
          if (!file || (!replaceKey && full)) return;
          await handleFile(file, replaceKey);
        }}
      />

      <Input
        ref={videoInputRef}
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
        disabled={(full && !items.some((item) => item.kind === "video")) || busy}
        className="h-9 shrink-0 rounded-lg border-iron bg-graphite"
      />
      {error ? <p className="shrink-0 text-xs text-error">{error}</p> : null}
    </div>
  );
}
