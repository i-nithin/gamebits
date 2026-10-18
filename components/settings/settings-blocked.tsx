import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SettingsBlocked() {
  return (
    <section className="flex min-h-full flex-1 flex-col rounded-xl border border-iron bg-obsidian px-5 py-5 sm:px-6">
      <h1 className="text-lg font-medium text-paper-white">Restore your account first</h1>
      <p className="mt-1 text-sm text-fog">
        This account is scheduled for deletion. Restore it from Security before changing these
        settings.
      </p>
      <Button
        nativeButton={false}
        className="mt-4 rounded-full"
        render={<Link href="/settings/security" />}
      >
        Security
      </Button>
    </section>
  );
}
