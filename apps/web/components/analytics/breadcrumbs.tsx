import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AnalyticsBreadcrumb = {
  label: string;
  href?: string;
};

export function AnalyticsBreadcrumbs({ items }: { items: AnalyticsBreadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {items.map((crumb, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
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
  );
}
