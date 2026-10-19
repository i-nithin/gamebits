export function AuthStatusPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <section className="w-full max-w-[400px] rounded-xl border border-iron bg-obsidian px-6 py-6 text-paper-white shadow-lg">
        <p className="text-xs tracking-wide text-fog uppercase">Account</p>
        <h1 className="mt-2 text-xl font-medium">{title}</h1>
        <p className="mt-2 text-sm text-fog">{description}</p>
        {children}
      </section>
    </div>
  );
}
