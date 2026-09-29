"use client";

import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  uploading,
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
  uploading?: boolean;
  error?: string | null;
  formAction?: (payload: FormData) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TooltipProvider delay={200}>
      <form
        action={formAction}
        className={cn(
          "flex min-h-[calc(100dvh-3.5rem-2.5rem)] flex-col",
          "sm:h-[calc(100dvh-3.5rem-2.5rem)] sm:overflow-hidden",
          className,
        )}
      >
      <div className="flex shrink-0 items-center gap-2 border-b border-iron px-4 py-3 sm:px-6 lg:px-10">
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

      <div className="grid min-h-0 w-full flex-1 gap-6 px-4 py-4 pb-20 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] sm:gap-0 sm:overflow-hidden sm:px-0 sm:py-0 sm:pb-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)]">
        <div className="flex min-h-0 min-w-0 flex-col sm:h-full sm:overflow-hidden sm:px-6 sm:py-6 lg:px-10">
          {left}
        </div>
        <Separator orientation="vertical" className="hidden bg-iron sm:block" />
        <div className="flex min-h-0 min-w-0 flex-col sm:h-full sm:overflow-y-auto sm:px-6 sm:py-6 lg:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {right}
        </div>
      </div>

      {children}

      <div className="sticky bottom-10 z-20 shrink-0 border-t border-iron bg-obsidian/95 backdrop-blur sm:static sm:bottom-auto">
        <div className="flex w-full flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:px-10">
          {error ? <p className="text-sm text-error sm:mr-auto">{error}</p> : null}
          <div className="flex items-center justify-end gap-2">
            <Link href={cancelHref}>
              <Button type="button" variant="outline" className="h-9 rounded-full border-iron px-5">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitDisabled || pending || uploading}
              className="h-9 rounded-full bg-ice-strong px-5 text-paper-white hover:bg-ice-strong/90"
            >
              {pending || uploading ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Saving…" : uploading ? "Uploading…" : submitLabel}
            </Button>
          </div>
        </div>
      </div>
      </form>
    </TooltipProvider>
  );
}
