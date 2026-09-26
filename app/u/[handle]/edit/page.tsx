import { notFound, redirect } from "next/navigation";

import { ProfileEditor } from "@/components/profile/profile-editor";
import { getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile, getProfileByHandle } from "@/lib/profile";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const [{ handle }, userId] = await Promise.all([params, getCurrentUserId()]);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  if (userId !== profile.clerkUserId) {
    redirect(`/u/${profile.handle}`);
  }

  const own = await ensureCurrentProfile();
  if (!own) redirect(`/u/${profile.handle}`);

  return (
    <ProfileEditor
      profile={{
        handle: own.handle,
        name: own.name,
        email: own.email ?? "",
        imageUrl: own.imageUrl ?? "",
        coverUrl: own.coverUrl ?? "",
        city: own.city ?? "",
        country: own.country ?? "",
        headline: own.headline ?? "",
        bio: own.bio ?? "",
        websiteUrl: own.websiteUrl ?? "",
        xUrl: own.xUrl ?? "",
        githubUrl: own.githubUrl ?? "",
        linkedinUrl: own.linkedinUrl ?? "",
        redditUrl: own.redditUrl ?? "",
      }}
    />
  );
}
