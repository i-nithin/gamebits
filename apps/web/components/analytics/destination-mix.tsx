import {
  ExternalLinkIcon,
  Gamepad2Icon,
  MessageCircleIcon,
  StoreIcon,
} from "lucide-react";

import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsClickRow } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

function destinationIcon(kind: string, label: string) {
  if (kind === "primary" || label === "Play") return Gamepad2Icon;
  if (kind === "discord" || kind === "x") return MessageCircleIcon;
  if (
    kind === "steam" ||
    kind === "playstore" ||
    kind === "appstore" ||
    kind === "nintendo" ||
    kind === "playstation" ||
    kind === "xbox"
  ) {
    return StoreIcon;
  }
  return ExternalLinkIcon;
}

export function AnalyticsDestinationMix({ clicks }: { clicks: AnalyticsClickRow[] }) {
  if (clicks.length === 0) {
    return (
      <div className="rounded-2xl bg-obsidian p-5 card-ring">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Where people clicked</h2>
        <p className="mt-4 text-sm text-fog">No link clicks in this period.</p>
      </div>
    );
  }

  const max = clicks.reduce((peak, click) => Math.max(peak, click.count), 0);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-obsidian p-5 card-ring">
      <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Where people clicked</h2>
      <div className="flex flex-col gap-4">
        {clicks.map((click) => {
          const Icon = destinationIcon(click.kind, click.label);
          const width = click.count > 0 && max > 0 ? (click.count / max) * 100 : 0;
          return (
            <div key={`${click.kind}-${click.label}`} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-paper-white">
                  <Icon className="size-4 shrink-0 text-fog" aria-hidden />
                  <span className="truncate">{click.label}</span>
                </span>
                <span className="stat-mono text-sm text-paper-white">
                  {formatAnalyticsCount(click.count)}
                </span>
              </div>
              <span className="block h-0.5 overflow-hidden rounded-full bg-graphite">
                <span
                  className={cn("block h-full rounded-full bg-ice-strong")}
                  style={{ width: `${width}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
