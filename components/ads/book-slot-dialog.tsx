"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BookSlotDialog({
  mode,
  label = "Book a slot",
}: {
  mode: "user" | "admin";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"place" | "game">("place");
  const railHref = mode === "admin" ? "/4dm1n/adbits/new" : "/adbits/new";
  const newGameHref =
    mode === "admin" ? "/4dm1n/games/new?next=admin-carousel" : "/games/new?next=carousel";
  const existingHref = mode === "admin" ? "/4dm1n/adbits/carousel/new" : "/adbits/carousel/new";

  function close(next: boolean) {
    setOpen(next);
    if (!next) setStep("place");
  }

  return (
    <>
      <Button className="h-9 rounded-full px-5" type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="border border-iron bg-obsidian text-paper-white sm:max-w-md">
          {step === "place" ? (
            <>
              <DialogHeader>
                <DialogTitle>Where should this ad run?</DialogTitle>
                <DialogDescription>
                  Right-rail cards and the home carousel each have six slots a month.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="h-11 justify-start rounded-xl border-iron px-4"
                  nativeButton={false}
                  render={<Link href={railHref} />}
                >
                  Right rail
                </Button>
                <Button
                  variant="outline"
                  className="h-11 justify-start rounded-xl border-iron px-4"
                  type="button"
                  onClick={() => setStep("game")}
                >
                  Carousel
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Which game is this for?</DialogTitle>
                <DialogDescription>
                  Carousel ads are for a game you have added. Pick one, or add it first.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="h-11 justify-start rounded-xl border-iron px-4"
                  nativeButton={false}
                  render={<Link href={newGameHref} />}
                >
                  Add a new game
                </Button>
                <Button
                  variant="outline"
                  className="h-11 justify-start rounded-xl border-iron px-4"
                  nativeButton={false}
                  render={<Link href={existingHref} />}
                >
                  Use an existing game
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 rounded-full"
                  type="button"
                  onClick={() => setStep("place")}
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
