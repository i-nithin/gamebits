import Image from "next/image";

import { cn } from "@/lib/utils";

export function AppMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      <Image
        src="/brand/logo.jpg"
        alt=""
        fill
        sizes="32px"
        className="scale-150 object-cover"
        priority
      />
    </span>
  );
}
