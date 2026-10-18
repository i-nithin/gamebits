import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function SettingsSoon({ title }: { title: string }) {
  return (
    <section className="flex min-h-full flex-1 flex-col rounded-xl border border-iron bg-obsidian px-5 py-5 sm:px-6">
      <h1 className="text-xl font-medium text-paper-white">{title}</h1>
      <Empty className="mt-6 border border-dashed border-iron">
        <EmptyHeader>
          <EmptyTitle>Coming later</EmptyTitle>
          <EmptyDescription>This section is not ready yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
}
