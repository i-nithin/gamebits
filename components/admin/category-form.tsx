"use client";

import { useActionState, useState } from "react";

import { upsertCategoryAction } from "@/app/actions/categories";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { categories } from "@/db/schema";
import { slugify } from "@/lib/sanitize";

type CategoryRow = typeof categories.$inferSelect;

export function CategoryForm({
  category,
  gameCount = 0,
}: {
  category?: CategoryRow;
  gameCount?: number;
}) {
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [archived, setArchived] = useState(Boolean(category?.archivedAt));
  const [state, action, pending] = useActionState(upsertCategoryAction, null);
  const inUse = gameCount > 0;

  const previewName = name.trim() || "Category name";
  const previewSlug = slug.trim() || slugify(name) || "slug";

  return (
    <GameFormShell
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Categories", href: "/admin/categories" },
        { label: isEdit ? category!.name : "New category" },
      ]}
      backHref="/admin/categories"
      cancelHref="/admin/categories"
      submitLabel={isEdit ? "Save category" : "Add category"}
      pending={pending}
      error={state?.error}
      formAction={action}
      left={
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Preview</p>
            <h2 className="text-lg font-medium">On the board</h2>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-wide text-fog uppercase">Chip</p>
            <span className="w-fit rounded-full border border-iron px-3 py-1 text-sm text-paper-white">
              {previewName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{previewSlug}</Badge>
            <Badge variant={isEdit && archived ? "outline" : "secondary"}>
              {isEdit && archived ? "Archived" : "Live"}
            </Badge>
          </div>
        </div>
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <h1 className="text-lg font-medium text-paper-white sm:text-xl">
              {isEdit ? "Edit category" : "Add a category"}
            </h1>
            <p className="mt-1 text-sm text-fog">
              Categories are shared across collections, the weekly board, and the game editor.
            </p>
          </div>

          <FieldGroup className="gap-4">
            <Field>
              <LabelWithInfo htmlFor="name" info="Shown on game chips, cards, and collection filters.">
                Name
              </LabelWithInfo>
              <Input
                id="name"
                name="name"
                required
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Racing"
                className="h-9 rounded-lg border-iron bg-graphite"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Field>
                <LabelWithInfo
                  htmlFor="slug"
                  info="Stable id used in collection filters. Leave blank to generate from the name."
                >
                  Slug
                </LabelWithInfo>
                <Input
                  id="slug"
                  name="slug"
                  maxLength={40}
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder={slugify(name) || "racing"}
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="sortOrder" info="Lower numbers appear first in filters and the editor.">
                  Sort order
                </LabelWithInfo>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={10000}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
            </div>
            {isEdit ? (
              <Field orientation="horizontal" className="rounded-xl bg-obsidian px-3 py-3 card-ring">
                <Switch
                  id="archived"
                  name="archived"
                  checked={archived}
                  disabled={inUse && !category?.archivedAt}
                  onCheckedChange={setArchived}
                />
                <FieldContent>
                  <LabelWithInfo
                    htmlFor="archived"
                    info="Hidden from new games and filters. Archiving is blocked while games still use it."
                  >
                    Archive this category
                  </LabelWithInfo>
                  <FieldDescription>
                    {inUse && !category?.archivedAt
                      ? `Used by ${gameCount} ${gameCount === 1 ? "game" : "games"}. Remove it from those games before archiving.`
                      : "Hidden from new games and collection filters."}
                  </FieldDescription>
                </FieldContent>
              </Field>
            ) : null}
          </FieldGroup>
        </div>
      }
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
    </GameFormShell>
  );
}
