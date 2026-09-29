import { formatAnalyticsCount } from "@/lib/analytics/format";
import type { AnalyticsCountryRow } from "@/lib/analytics/types";
import { countryFlag, countryName, isCountryCode } from "@/lib/countries";

export function AnalyticsCountriesPanel({ countries }: { countries: AnalyticsCountryRow[] }) {
  const max = countries.reduce((peak, row) => Math.max(peak, row.pageViews), 0);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-obsidian p-5 card-ring">
      <div className="flex flex-col gap-1">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Top countries</h2>
        <p className="text-xs leading-5 text-fog">Where page views came from</p>
      </div>

      {countries.length === 0 ? (
        <p className="text-sm leading-6 text-fog">
          Country data appears as people visit. Older traffic before this update has no location.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {countries.map((row) => {
            const flag = isCountryCode(row.code) ? countryFlag(row.code) : "";
            const name = countryName(row.code) ?? row.code;
            const width = row.pageViews > 0 && max > 0 ? (row.pageViews / max) * 100 : 0;
            return (
              <div key={row.code} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-paper-white">
                    <span className="text-base leading-none" aria-hidden>
                      {flag || "🌐"}
                    </span>
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="stat-mono shrink-0 text-sm text-paper-white">
                    {formatAnalyticsCount(row.pageViews)}
                  </span>
                </div>
                <span className="block h-0.5 overflow-hidden rounded-full bg-graphite">
                  <span
                    className="block h-full rounded-full bg-ice-strong"
                    style={{ width: `${width}%` }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
