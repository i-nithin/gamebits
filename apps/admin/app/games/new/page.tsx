import Link from "next/link";

import { GameForm } from "@/components/game-form";
import { PageHeader } from "@/components/shell";
import { listActiveCategories, listActivePlatforms } from "@gamebits/core/queries";

export default async function NewGamePage() {
  const [platforms, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return (
    <>
      <PageHeader
        title="New game"
        action={
          <Link href="/games" className="text-sm text-fog hover:text-white">
            Back
          </Link>
        }
      />
      <GameForm
        links={[]}
        platformIds={[]}
        categoryIds={[]}
        platforms={platforms.map((platform) => ({ id: platform.id, name: platform.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </>
  );
}
