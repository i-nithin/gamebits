"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { notifyError } from "@/lib/notify";

export function AdbitsFormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-xs tracking-wide text-fog uppercase">{label}</p>
      <div className="flex flex-col gap-4 overflow-hidden rounded-sm border border-iron bg-page px-4 py-4">
        {children}
      </div>
    </div>
  );
}

export function AdbitsFormCard({
  title,
  description,
  preview,
  children,
  hidden,
  submitLabel,
  submitDisabled,
  pending,
  uploading,
  error,
  formAction,
}: {
  title: string;
  description: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  hidden?: React.ReactNode;
  submitLabel: string;
  submitDisabled?: boolean;
  pending?: boolean;
  uploading?: boolean;
  error?: string | null;
  formAction?: (formData: FormData) => void;
}) {
  const wasPending = useRef(false);
  const blocked = Boolean(submitDisabled || pending || uploading);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    if (error) notifyError("Couldn't save.", error);
  }, [pending, error]);

  return (
    <TooltipProvider delay={200}>
      <form
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        action={(formData) => {
          if (blocked || !formAction) return;
          formAction(formData);
        }}
      >
        {hidden}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-iron bg-obsidian">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex w-full flex-col gap-6 sm:w-[90%] md:w-[70%]">
              {preview}
              <div>
                <h1 className="text-xl font-medium text-paper-white">{title}</h1>
                <p className="mt-1 text-sm text-fog">{description}</p>
              </div>
              <div className="flex flex-col gap-6">{children}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center border-t border-iron bg-obsidian px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full justify-end sm:w-[90%] md:w-[70%]">
              <Button
                type="submit"
                disabled={blocked}
                className="rounded-full bg-ice-strong px-5 text-white hover:bg-ice-strong/90"
              >
                {pending || uploading ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Saving…" : uploading ? "Uploading…" : submitLabel}
              </Button>
            </div>
          </div>
        </section>
      </form>
    </TooltipProvider>
  );
}
