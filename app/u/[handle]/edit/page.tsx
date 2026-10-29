import { notFound, redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileByHandle } from "@/lib/profile";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const [{ handle }, userId] = await Promise.all([params, getCurrentUserId()]);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  if (userId !== profile.clerkUserId) redirect(`/u/${profile.handle}`);
  redirect("/settings/profile");
}

export const metadata = { title: 'Edit Profile' };
