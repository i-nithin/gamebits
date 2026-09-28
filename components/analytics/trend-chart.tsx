"use client";

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

const chartConfig = {
  pageViews: {
    label: "Views",
    color: "var(--chart-1)",
  },
  linkClicks: {
    label: "Link clicks",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function AnalyticsTrendChart({
  series,
  className,
}: {
  series: AnalyticsSeriesPoint[];
  className?: string;
}) {
  const empty = series.length === 0 || series.every((p) => p.pageViews === 0 && p.linkClicks === 0);

  if (empty) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-obsidian card-ring">
        <p className="text-sm text-fog">No activity in this period.</p>
      </div>
    );
  }

  const data = series.map((point) => ({
    ...point,
    label: formatChartDay(point.day),
  }));

  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-pageViews)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-pageViews)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-linkClicks)" stopOpacity={0.3} />
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
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            dataKey="pageViews"
            type="monotone"
            fill="url(#fillViews)"
            stroke="var(--color-pageViews)"
            strokeWidth={2}
          />
          <Area
            dataKey="linkClicks"
            type="monotone"
            fill="url(#fillClicks)"
            stroke="var(--color-linkClicks)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
