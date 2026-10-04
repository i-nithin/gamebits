"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MonthOption } from "@/lib/ads-types";

function monthChoice(month: MonthOption) {
  const count = `${month.label} · ${month.booked}/${month.cap}`;
  return month.full ? `${count} · Full` : count;
}

export function AdminMonthFilter({
  months,
  value,
}: {
  months: MonthOption[];
  value: string;
}) {
  const router = useRouter();
  const selected = months.find((month) => month.key === value) ?? months[0];

  return (
    <Select
      value={selected?.key ?? null}
      onValueChange={(next) => {
        if (next) router.push(`/4dm1n/adbits?month=${next}`);
      }}
    >
      <SelectTrigger
        type="button"
        className="h-9 w-full rounded-lg border-iron bg-graphite sm:w-64"
        aria-label="Month"
      >
        <SelectValue>{selected ? monthChoice(selected) : "Month"}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="border-iron bg-obsidian p-1 shadow-lg">
        <SelectGroup>
          {months.map((month) => (
            <SelectItem key={month.key} value={month.key}>
              {monthChoice(month)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
