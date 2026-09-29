import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
