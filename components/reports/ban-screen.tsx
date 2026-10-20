"use client";

import { SignOutButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";

export function BanScreen({ reason }: { reason: string | null }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-obsidian p-6 card-ring">
        <h1 className="text-xl font-medium text-paper-white">This account is banned</h1>
        <p className="text-sm leading-6 text-fog">
          {reason || "This account broke the GameBits rules."}
        </p>
        {clerkEnabled ? (
          <SignOutButton redirectUrl="/">
            <Button type="button" variant="outline" className="w-fit">
              Sign out
            </Button>
          </SignOutButton>
        ) : null}
      </div>
    </div>
  );
}
