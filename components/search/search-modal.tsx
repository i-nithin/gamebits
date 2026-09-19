"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/components/search/search-provider";

export function SearchModal() {
  const { open, setOpen, games } = useSearch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search GameBits"
      description="Find a game on the board"
      className="sm:max-w-xl bg-graphite card-ring"
    >
      <Command className="bg-graphite">
        <CommandInput placeholder="Search games" />
        <CommandList>
          <CommandEmpty>No games found.</CommandEmpty>
          <CommandGroup heading="Games">
            {games.map((game) => (
              <CommandItem
                key={game.slug}
                value={`${game.name} ${game.tagline}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/games/${game.slug}`);
                }}
              >
                <span className="truncate font-medium">{game.name}</span>
                <span className="truncate text-fog">{game.tagline}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
