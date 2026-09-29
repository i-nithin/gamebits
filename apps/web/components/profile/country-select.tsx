"use client";

import { useState } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { COUNTRIES, countryFlag, countryName, isCountryCode } from "@/lib/countries";
import { cn } from "@/lib/utils";

export function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = isCountryCode(value)
    ? { code: value.toUpperCase(), name: countryName(value), flag: countryFlag(value) }
    : null;

  return (
    <>
      <input type="hidden" name="country" value={selected?.code ?? ""} />
      <div className="flex h-9 w-full items-center rounded-lg border border-iron bg-graphite">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-sm"
        >
          {selected?.name ? (
            <>
              <span aria-hidden className="text-base leading-none">
                {selected.flag}
              </span>
              <span className="truncate text-paper-white">{selected.name}</span>
            </>
          ) : (
            <span className="truncate text-fog">Select a country</span>
          )}
          <ChevronDownIcon className="ml-auto size-4 shrink-0 text-fog" />
        </button>
        {selected ? (
          <button
            type="button"
            aria-label="Clear country"
            onClick={() => onChange("")}
            className="mr-1 flex size-7 items-center justify-center rounded-full text-fog hover:bg-slate hover:text-paper-white"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a country"
        description="Search and select a country"
        className={cn("top-[12%] max-w-[calc(100%-2rem)] translate-y-0 p-0 sm:max-w-md")}
      >
        <Command>
          <CommandInput placeholder="Search countries" />
          <CommandList>
            <CommandEmpty>No country found</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  data-checked={country.code === selected?.code ? true : undefined}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden className="text-base leading-none">
                    {country.flag}
                  </span>
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
