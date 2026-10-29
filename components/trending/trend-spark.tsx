import { sparklinePolyline, trendLineClass } from "@/lib/trending/sparkline";
import { cn } from "@/lib/utils";

export function TrendSpark({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 52 22"
      aria-hidden
      className={cn("h-[22px] w-[52px] shrink-0", trendLineClass(points), className)}
    >
      <polyline
        points={sparklinePolyline(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
