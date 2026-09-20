"use client";

import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FormBreadcrumb = {
  label: string;
  href?: string;
};

export function GameFormShell({
  breadcrumbs,
  backHref,
  left,
  right,
  cancelHref,
  submitLabel,
  submitDisabled,
  pending,
  error,
  formAction,
  children,
  className,
}: {
  breadcrumbs: FormBreadcrumb[];
  backHref: string;
  left: React.ReactNode;
  right: React.ReactNode;
  cancelHref: string;
  submitLabel: string;
  submitDisabled?: boolean;
  pending?: boolean;
  error?: string | null;
  formAction?: React.ComponentProps<"form">["action"];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={formAction}
      className={cn(
        "flex min-h-[calc(100dvh-3.5rem-2.5rem)] flex-col",
        "md:h-[calc(100dvh-3.5rem-2.5rem)] md:overflow-hidden",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-iron px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          aria-label="Back"
          className="flex size-8 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        >
          <ArrowLeftIcon className="size-4" strokeWidth={1.5} />
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const last = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRightIcon className="size-3.5 shrink-0 text-fog" strokeWidth={1.5} />
                ) : null}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="truncate text-fog hover:text-paper-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", last ? "text-paper-white" : "text-fog")}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="grid w-full min-h-0 flex-1 gap-6 px-4 py-4 md:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)] md:gap-8 md:overflow-hidden sm:px-6 lg:px-8 xl:grid-cols-[minmax(20rem,0.6fr)_minmax(0,1.4fr)]">
        <div className="flex h-full min-h-0 min-w-0 flex-col md:overflow-hidden">{left}</div>
        <div className="flex h-full min-h-0 min-w-0 flex-col md:overflow-hidden">{right}</div>
      </div>

      {children}

      <div className="sticky bottom-10 z-20 shrink-0 border-t border-iron bg-obsidian/95 backdrop-blur md:static md:bottom-auto">
        <div className="flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:px-8">
          {error ? <p className="text-sm text-error sm:mr-auto">{error}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <Link href={cancelHref}>
              <Button type="button" variant="outline" className="h-9 border-iron px-4">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitDisabled || pending}
              className="h-9 bg-ice-strong px-4 text-paper-white hover:bg-ice-strong/90"
            >
              {pending ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
