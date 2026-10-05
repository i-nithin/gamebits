import Link from "next/link";

import type { AdPlacement } from "@/lib/ads-types";
import { cn } from "@/lib/utils";

export function PlacementSwitch({
  value,
  hrefFor,
}: {
  value: AdPlacement;
  hrefFor: (placement: AdPlacement) => string;
}) {
  const options: Array<{ id: AdPlacement; label: string }> = [
    { id: "sidebar", label: "Right rail" },
    { id: "carousel", label: "Carousel" },
  ];

  return (
    <div className="flex w-full rounded-full border border-iron bg-obsidian p-1 sm:w-auto">
      {options.map((option) => (
        <Link
          key={option.id}
          href={hrefFor(option.id)}
          aria-current={value === option.id ? "page" : undefined}
          className={cn(
            "flex-1 rounded-full px-4 py-1.5 text-center text-sm sm:flex-none",
            value === option.id ? "bg-graphite text-paper-white" : "text-fog hover:text-paper-white",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
