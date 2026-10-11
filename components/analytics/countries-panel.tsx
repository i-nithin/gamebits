"use client";

import { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import worldAtlas from "world-atlas/countries-110m.json";

import { formatAnalyticsCount } from "@/lib/analytics/format";
import { alpha2FromNumericId } from "@/lib/analytics/iso-numeric";
import type { AnalyticsCountryRow } from "@/lib/analytics/types";
import { countryFlag, countryName, isCountryCode } from "@/lib/countries";
import { cn } from "@/lib/utils";

const TOP_COUNTRIES = 8;
const GRAPHITE = "#26272d";
const ICE_SOFT: Rgb = [31, 51, 71];
const ICE_STRONG: Rgb = [42, 147, 255];
const ICE_SIGNAL: Rgb = [131, 195, 255];

type Rgb = [number, number, number];

type HoverState = {
  code: string;
  name: string;
  views: number;
};

function mix(from: Rgb, to: Rgb, amount: number) {
  const channels = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  );
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function fillFor(views: number, max: number) {
  if (views <= 0 || max <= 0) return GRAPHITE;
  const t = Math.min(1, views / max);
  if (t < 0.45) return mix(ICE_SOFT, ICE_STRONG, t / 0.45);
  return mix(ICE_STRONG, ICE_SIGNAL, (t - 0.45) / 0.55);
}

export function AnalyticsCountriesPanel({ countries }: { countries: AnalyticsCountryRow[] }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, AnalyticsCountryRow>();
    for (const row of countries) map.set(row.code, row);
    return map;
  }, [countries]);

  const max = countries.reduce((peak, row) => Math.max(peak, row.pageViews), 0);
  const ranked = countries.slice(0, TOP_COUNTRIES);
  const totalViews = countries.reduce((sum, row) => sum + row.pageViews, 0);

  function selectCode(code: string | null) {
    activeRef.current = code;
    setActiveCode(code);
  }

  function placeHover(code: string, event: React.MouseEvent) {
    const frame = frameRef.current;
    const tip = tipRef.current;
    const row = byCode.get(code);
    if (!frame || !tip || !row) return;

    const bounds = frame.getBoundingClientRect();
    const x = Math.min(
      Math.max(event.clientX - bounds.left + 14, 12),
      Math.max(bounds.width - 176, 12),
    );
    const y = Math.min(
      Math.max(event.clientY - bounds.top - 56, 12),
      Math.max(bounds.height - 72, 12),
    );
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.hidden = false;

    if (activeRef.current === code) return;
    selectCode(code);
    setHover({
      code,
      name: countryName(code) ?? code,
      views: row.pageViews,
    });
  }

  function clearHover() {
    if (tipRef.current) tipRef.current.hidden = true;
    selectCode(null);
    setHover(null);
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-obsidian card-ring">
      <div className="flex flex-col gap-1 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Audience</h2>
          <p className="mt-1 text-sm text-paper-white">Where views came from</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-fog">
          <span>Fewer</span>
          <span className="h-1.5 w-24 rounded-full bg-linear-to-r from-[#1f3347] via-[#2a93ff] to-[#83c3ff]" />
          <span>More</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.5fr)_17.5rem]">
        <div ref={frameRef} className="relative w-full" onMouseLeave={clearHover}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(42,147,255,0.18),transparent_68%)]" />
          <ComposableMap
            projection="geoEqualEarth"
            width={960}
            height={470}
            className="relative block aspect-[960/470] h-auto w-full"
          >
            <Geographies geography={worldAtlas as never}>
              {({ geographies }) =>
                geographies
                  .filter((geo) => String(geo.id ?? "") !== "010")
                  .map((geo) => {
                    const code = alpha2FromNumericId(geo.id);
                    const views = code ? (byCode.get(code)?.pageViews ?? 0) : 0;
                    const active = code != null && code === activeCode && views > 0;
                    const fill = active ? mix(ICE_STRONG, ICE_SIGNAL, 0.72) : fillFor(views, max);
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        tabIndex={-1}
                        onMouseEnter={(event) => {
                          if (!code || views <= 0) return;
                          placeHover(code, event);
                        }}
                        onMouseMove={(event) => {
                          if (!code || views <= 0) return;
                          placeHover(code, event);
                        }}
                        style={{
                          fill,
                          stroke: active ? "#83c3ff" : "rgba(255,255,255,0.08)",
                          strokeWidth: active ? 1.1 : 0.45,
                          outline: "none",
                          cursor: views > 0 ? "pointer" : "default",
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ComposableMap>
          <div
            ref={tipRef}
            hidden={!hover}
            className="pointer-events-none absolute z-10 w-max max-w-48 rounded-xl bg-graphite px-3 py-2 shadow-xl card-ring"
          >
            {hover ? (
              <>
                <p className="flex items-center gap-2 text-sm text-paper-white">
                  <span aria-hidden>
                    {isCountryCode(hover.code) ? countryFlag(hover.code) : "🌐"}
                  </span>
                  <span className="truncate">{hover.name}</span>
                </p>
                <p className="stat-mono mt-1 text-xs text-ice-signal">
                  {formatAnalyticsCount(hover.views)} views
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/6 px-5 py-5 lg:border-t-0 lg:border-l">
          {ranked.length === 0 ? (
            <p className="text-sm leading-6 text-fog">
              Country data appears as people visit. Older traffic before this update has no location.
            </p>
          ) : (
            ranked.map((row) => {
              const flag = isCountryCode(row.code) ? countryFlag(row.code) : "";
              const name = countryName(row.code) ?? row.code;
              const width = row.pageViews > 0 && max > 0 ? (row.pageViews / max) * 100 : 0;
              const share = totalViews > 0 ? Math.round((row.pageViews / totalViews) * 100) : 0;
              const active = row.code === activeCode;
              return (
                <button
                  key={row.code}
                  type="button"
                  className={cn(
                    "flex flex-col gap-1.5 rounded-xl px-2 py-1.5 text-left transition-colors",
                    active ? "bg-graphite" : "hover:bg-white/4",
                  )}
                  onMouseEnter={() => selectCode(row.code)}
                  onMouseLeave={() => selectCode(null)}
                  onFocus={() => selectCode(row.code)}
                  onBlur={() => selectCode(null)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-paper-white">
                      <span className="text-base leading-none" aria-hidden>
                        {flag || "🌐"}
                      </span>
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="stat-mono shrink-0 text-sm text-paper-white">
                      {formatAnalyticsCount(row.pageViews)}
                    </span>
                  </span>
                  <span className="block h-0.5 overflow-hidden rounded-full bg-graphite">
                    <span
                      className="block h-full rounded-full bg-ice-strong"
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="stat-mono text-[11px] text-fog">{share}% of located views</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
