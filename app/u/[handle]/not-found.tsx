import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-medium">Profile not found</h1>
      <p className="text-sm text-fog">That person does not have a GameBits profile.</p>
      <Link href="/">
        <Button>Back to this week</Button>
      </Link>
    </div>
  );
}
