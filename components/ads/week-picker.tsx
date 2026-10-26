"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription } from "@/components/ui/field";
import { formatUsd } from "@/lib/ad-catalog";
import type { WeekOption } from "@/lib/ads-types";

export function WeekPicker({
  weeks,
  monthLabel,
  selected,
  onChange,
  unitCents,
  admin = false,
}: {
  weeks: WeekOption[];
  monthLabel: string;
  selected: string[];
  onChange: (keys: string[]) => void;
  unitCents: number;
  admin?: boolean;
}) {
  const selectedSet = new Set(selected);
  const count = selected.length;
  const open = weeks.some((week) => !week.full);

  function toggle(key: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    onChange([...next].sort());
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-paper-white">{monthLabel}</p>
      {weeks.length === 0 ? (
        <p className="text-sm text-fog">No weeks are open.</p>
      ) : (
        <ul className="overflow-hidden rounded-sm border border-iron bg-page">
          {weeks.map((week) => (
            <li key={week.key} className="border-b border-iron last:border-b-0">
              <label
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${week.full ? "text-fog" : "cursor-pointer text-paper-white"}`}
              >
                <Checkbox
                  checked={selectedSet.has(week.key)}
                  disabled={week.full}
                  onCheckedChange={(checked) => toggle(week.key, checked === true)}
                />
                <span className="min-w-0 flex-1">{week.label}</span>
                <span className="shrink-0 text-xs text-fog">
                  {week.full ? "Full" : `${week.cap - week.booked} open`}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <FieldDescription>
        {!open
          ? "Every week next month is full."
          : count > 0
            ? admin
              ? `${count} ${count === 1 ? "week" : "weeks"}. Each week holds six ads.`
              : `${count} ${count === 1 ? "week" : "weeks"} · ${formatUsd(unitCents * count)} before tax.`
            : `${formatUsd(unitCents)} per week. Pick the weeks you want.`}
      </FieldDescription>
    </div>
  );
}
