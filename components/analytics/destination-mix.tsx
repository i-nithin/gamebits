"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ExternalLinkIcon,
  Gamepad2Icon,
  MessageCircleIcon,
  StoreIcon,
} from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsClickRow } from "@/lib/analytics/types";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
];

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
      <div className="rounded-sm bg-obsidian p-5 card-ring">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Where people clicked</h2>
        <p className="mt-4 text-sm text-fog">No link clicks in this period.</p>
      </div>
    );
  }

  const total = clicks.reduce((sum, click) => sum + click.count, 0);
  const slices = clicks.map((click, index) => ({
    key: `${click.kind}-${index}`,
    label: click.label,
    kind: click.kind,
    count: click.count,
    fill: SLICE_COLORS[index % SLICE_COLORS.length],
    share: total > 0 ? Math.round((click.count / total) * 100) : 0,
  }));
  const chartConfig = {
    count: { label: "Clicks" },
    ...Object.fromEntries(
      slices.map((slice) => [slice.key, { label: slice.label, color: slice.fill }]),
    ),
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-4 rounded-sm bg-obsidian p-5 card-ring">
      <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Where people clicked</h2>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <div className="relative h-52 w-52 shrink-0">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-full w-full"
            initialDimension={{ width: 208, height: 208 }}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie
                data={slices}
                dataKey="count"
                nameKey="key"
                innerRadius={68}
                outerRadius={96}
                stroke="var(--gb-obsidian)"
                strokeWidth={3}
                paddingAngle={slices.length > 1 ? 3 : 0}
              >
                {slices.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="stat-mono text-2xl text-paper-white">
              {formatAnalyticsCount(total)}
            </span>
            <span className="text-xs text-fog">clicks</span>
          </div>
        </div>
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-4">
          {slices.map((slice) => {
            const Icon = destinationIcon(slice.kind, slice.label);
            return (
              <li key={slice.key} className="flex flex-col gap-2">
                <span className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <Icon className="size-4 shrink-0 text-fog" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-paper-white">
                    {slice.label}
                  </span>
                  <span className="stat-mono text-sm text-paper-white">
                    {formatAnalyticsCount(slice.count)}
                  </span>
                  <span className="stat-mono w-10 text-right text-xs text-fog">{slice.share}%</span>
                </span>
                <span className="block h-1 overflow-hidden rounded-full bg-white/8">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${slice.share}%`, backgroundColor: slice.fill }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
