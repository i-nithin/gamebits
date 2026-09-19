import { CircleIcon, LifeBuoyIcon, Share2Icon, ZapIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="sticky bottom-0 z-20 flex min-h-10 shrink-0 items-center justify-between gap-3 overflow-x-auto border-t border-iron bg-obsidian px-3 py-2 text-xs text-fog sm:h-10 sm:px-4 sm:py-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center gap-1.5">
          <CircleIcon className="size-1.5 fill-success text-success" />
          Live
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <ZapIcon className="size-3.5" />
          Aggregating
        </span>
        <span className="hidden items-center gap-1.5 md:inline-flex">
          <Share2Icon className="size-3.5" />
          Networks
        </span>
        <span className="hidden sm:inline">Terms</span>
        <span className="hidden sm:inline">Privacy</span>
      </div>
      <a
        href="mailto:hello@gamebits.app"
        className="inline-flex items-center gap-1.5 hover:text-paper-white"
      >
        <LifeBuoyIcon className="size-3.5" />
        Support
      </a>
    </footer>
  );
}
