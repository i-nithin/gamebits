import type { GamePlatformItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlatformChip({
  platform,
  className,
}: {
  platform: GamePlatformItem;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-iron px-2 py-1 text-[11px] tracking-wide text-fog uppercase",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={platform.logoUrl} alt="" className="size-3.5 shrink-0 object-contain" />
      {platform.name}
    </span>
  );
}

export function PlatformChipList({
  platforms,
  className,
  chipClassName,
}: {
  platforms: GamePlatformItem[];
  className?: string;
  chipClassName?: string;
}) {
  if (platforms.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {platforms.map((platform) => (
        <PlatformChip key={platform.id} platform={platform} className={chipClassName} />
      ))}
    </span>
  );
}
