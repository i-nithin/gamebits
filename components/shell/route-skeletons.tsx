import { Skeleton } from "@/components/ui/skeleton";

function CardRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-3 pb-8 sm:px-6 lg:flex-row lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <Skeleton className="h-64 w-full rounded-2xl sm:h-80" />
        <div className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-16 rounded-full" />
            ))}
          </div>
          <CardRow />
        </div>
      </div>
      <Skeleton className="hidden h-[28rem] w-72 shrink-0 rounded-2xl lg:block" />
    </div>
  );
}

export function GameSkeleton() {
  return (
    <article className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-10">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-5 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-none" />
            ))}
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </article>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <CardRow count={8} />
    </div>
  );
}

export function CollectionsSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row lg:items-start">
      <div className="hidden w-80 shrink-0 flex-col gap-3 border-r border-iron px-4 py-6 lg:flex">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="flex items-end gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pb-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <CardRow />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AdbitsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:gap-5 md:px-5 md:py-5">
      <div className="flex gap-2 md:w-48 md:flex-col">
        <Skeleton className="h-9 w-28 rounded-full md:w-full md:rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-full md:w-full md:rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-full md:w-full md:rounded-lg" />
      </div>
      <Skeleton className="h-80 min-w-0 flex-1 rounded-xl" />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:gap-5 md:px-5 md:py-5">
      <div className="flex gap-2 md:w-48 md:flex-col">
        <Skeleton className="h-9 w-24 rounded-full md:w-full md:rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-full md:w-full md:rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-full md:w-full md:rounded-lg" />
      </div>
      <Skeleton className="h-80 min-w-0 flex-1 rounded-xl" />
    </div>
  );
}
