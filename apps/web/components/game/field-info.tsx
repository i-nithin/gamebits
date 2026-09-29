"use client";

import { InfoIcon } from "lucide-react";

import { FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-fog hover:text-ice-signal"
        aria-label={text}
      >
        <InfoIcon className="size-3.5" strokeWidth={1.5} />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border border-iron bg-graphite text-paper-white"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function LabelWithInfo({
  htmlFor,
  children,
  info,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  info: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor}>{children}</FieldLabel>
      <InfoTip text={info} />
    </span>
  );
}
