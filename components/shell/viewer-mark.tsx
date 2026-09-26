import Image from "next/image";
import { UserIcon } from "lucide-react";

import type { Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ViewerMark({
  viewer,
  className,
}: {
  viewer: Viewer | null;
  className?: string;
}) {
  const initial = viewer?.name.trim().charAt(0).toUpperCase() ?? "";

  return (
    <span
      className={cn(
        "relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate text-[10px] font-medium text-paper-white",
        className,
      )}
    >
      {viewer?.imageUrl ? (
        <Image src={viewer.imageUrl} alt="" fill className="object-cover" sizes="32px" />
      ) : initial ? (
        initial
      ) : (
        <UserIcon className="size-4" />
      )}
    </span>
  );
}
