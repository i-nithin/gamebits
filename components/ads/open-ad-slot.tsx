import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function OpenAdSlot({ className }: { className?: string }) {
  return (
    <Link
      href="/adbits"
      className={cn(
        "block rounded-2xl bg-[#222222] p-4 text-paper-white outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-paper-white">
        <MegaphoneIcon className="size-5" strokeWidth={1.5} />
      </span>
      <span className="mt-3 block text-base font-semibold">Your ad here</span>
      <span className="mt-1 block text-sm text-[#a3a3a3]">Book a slot this month</span>
      <span className="my-3 block h-px bg-white/15" />
      <span className="flex items-center justify-between gap-3 text-sm text-[#a3a3a3]">
        <span>Advertise</span>
        <span>Promoted</span>
      </span>
    </Link>
  );
}
