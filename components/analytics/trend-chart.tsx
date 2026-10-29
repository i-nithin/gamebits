"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatAnalyticsCount, formatChartDay } from "@/lib/analytics/format";
import type { AnalyticsSeriesPoint } from "@/lib/analytics/types";
import { trendLineColor } from "@/lib/trending/sparkline";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "all", label: "All" },
  { key: "views", label: "Views" },
  { key: "clicks", label: "Clicks" },
] as const;

type SeriesMode = (typeof MODES)[number]["key"];

export function AnalyticsTrendChart({
  series,
  className,
}: {
  series: AnalyticsSeriesPoint[];
  className?: string;
}) {
  const [mode, setMode] = useState<SeriesMode>("all");
  const chartConfig = {
    pageViews: {
      label: "Views",
      color: trendLineColor(series.map((point) => point.pageViews)),
    },
    linkClicks: {
      label: "Link clicks",
      color: trendLineColor(series.map((point) => point.linkClicks)),
    },
  } satisfies ChartConfig;
  const gradientId = useId().replace(/:/g, "");
  const viewsFill = `${gradientId}-views`;
  const clicksFill = `${gradientId}-clicks`;

  const showViews = mode !== "clicks";
  const showClicks = mode !== "views";
  const empty =
    series.length === 0 ||
    series.every((point) => {
      const viewsQuiet = !showViews || point.pageViews === 0;
      const clicksQuiet = !showClicks || point.linkClicks === 0;
      return viewsQuiet && clicksQuiet;
    });

  const data = series.map((point) => ({
    ...point,
    label: formatChartDay(point.day),
  }));

  const emptyCopy =
    mode === "views"
      ? "No views in this period."
      : mode === "clicks"
        ? "No link clicks in this period."
        : "No activity in this period.";

  return (
    <section className={cn("flex flex-col gap-4 rounded-sm bg-obsidian p-4 sm:p-5 card-ring", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">
          Views and link clicks over time
        </h2>
        <div className="flex w-fit items-center gap-1 rounded-full bg-graphite/80 p-1">
          {MODES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={mode === item.key}
              onClick={() => setMode(item.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                mode === item.key ? "bg-obsidian text-ice-signal" : "text-fog hover:text-paper-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="flex h-56 items-center justify-center">
          <p className="text-sm text-fog">{emptyCopy}</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={viewsFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pageViews)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-pageViews)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={clicksFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-linkClicks)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-linkClicks)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(value) => formatAnalyticsCount(Number(value))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const day = payload?.[0]?.payload?.day as string | undefined;
                    return day ? formatChartDay(day) : "";
                  }}
                />
              }
            />
            {mode === "all" ? <ChartLegend content={<ChartLegendContent />} /> : null}
            {showViews ? (
              <Area
                dataKey="pageViews"
                type="monotone"
                fill={`url(#${viewsFill})`}
                stroke="var(--color-pageViews)"
                strokeWidth={2}
              />
            ) : null}
            {showClicks ? (
              <Area
                dataKey="linkClicks"
                type="monotone"
                fill={`url(#${clicksFill})`}
                stroke="var(--color-linkClicks)"
                strokeWidth={2}
              />
            ) : null}
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}
