"use client";

import { useActionState, useState } from "react";

import { saveCategoryAction, savePlatformAction } from "@/app/actions/mutations";
import { UploadField } from "@/components/upload-field";

export function PlatformForm({
  platform,
}: {
  platform?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    sortOrder: number;
    archivedAt: Date | null;
  };
}) {
  const [state, action, pending] = useActionState(savePlatformAction, null);
  const [logoUrl, setLogoUrl] = useState(platform?.logoUrl ?? "");
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      {platform ? <input type="hidden" name="id" value={platform.id} /> : null}
      <UploadField
        name="logoUrl"
        label="Logo"
        purpose="platform"
        value={logoUrl}
        onChange={setLogoUrl}
      />
      <Text name="name" label="Name" defaultValue={platform?.name} required />
      <Text name="slug" label="Slug" defaultValue={platform?.slug} />
      <Text name="sortOrder" label="Sort order" defaultValue={String(platform?.sortOrder ?? 0)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="archived" defaultChecked={Boolean(platform?.archivedAt)} />
        Archived
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending || !logoUrl}
        className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-void disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save platform"}
      </button>
    </form>
  );
}

export function CategoryForm({
  category,
}: {
  category?: { id: string; name: string; slug: string; sortOrder: number; archivedAt: Date | null };
}) {
  const [state, action, pending] = useActionState(saveCategoryAction, null);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Text name="name" label="Name" defaultValue={category?.name} required />
      <Text name="slug" label="Slug" defaultValue={category?.slug} />
      <Text name="sortOrder" label="Sort order" defaultValue={String(category?.sortOrder ?? 0)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="archived" defaultChecked={Boolean(category?.archivedAt)} />
        Archived
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-void disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save category"}
      </button>
    </form>
  );
}

function Text({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-fog">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="rounded-lg border border-white/10 bg-graphite px-3 py-2"
      />
    </label>
  );
}
