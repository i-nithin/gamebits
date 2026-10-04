import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function OpenAdSlot({ className }: { className?: string }) {
  return (
    <Link
      href="/adbits"
      className={cn(
        "group flex h-[108px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-iron bg-graphite px-4 text-center transition-colors hover:border-ice-signal",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-slate text-fog transition-colors group-hover:text-ice-signal">
        <MegaphoneIcon className="size-4" strokeWidth={1.5} />
      </span>
      <span className="text-sm font-medium text-paper-white">Your ad here</span>
      <span className="text-xs text-fog">Book a slot this month</span>
    </Link>
  );
}
