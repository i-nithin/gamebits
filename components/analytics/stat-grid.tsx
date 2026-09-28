import type { AnalyticsStat } from "@/components/analytics/stat-items";
import { cn } from "@/lib/utils";

export function AnalyticsSummary({
  primary,
  secondary,
}: {
  primary: AnalyticsStat[];
  secondary: AnalyticsStat[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "grid gap-px overflow-hidden rounded-2xl bg-white/8 card-ring",
          primary.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
        )}
      >
        {primary.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 bg-obsidian px-4 py-5 sm:px-5">
            <span className="text-[11px] tracking-[0.08em] text-fog uppercase">{stat.label}</span>
            <span className="stat-mono text-2xl text-paper-white sm:text-3xl">{stat.value}</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-sm leading-6 text-fog">
        {secondary.map((stat, index) => (
          <span key={stat.label} className="whitespace-nowrap">
            <span>{stat.label}</span>{" "}
            <span className="stat-mono text-paper-white">{stat.value}</span>
            {index < secondary.length - 1 ? <span className="text-white/25"> · </span> : null}
          </span>
        ))}
      </p>
    </div>
  );
}
