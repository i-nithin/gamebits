import { ProfileEditor } from "@/components/profile/profile-editor";
import { SettingsBlocked } from "@/components/settings/settings-blocked";
import { isCountryCode } from "@/lib/countries";
import { getSettingsGate } from "@/lib/settings/gate";

export default async function SettingsProfilePage() {
  const gate = await getSettingsGate();
  if (gate.status !== "ready") return null;
  if (gate.scheduled) return <SettingsBlocked />;

  const profile = gate.profile;
  const country = profile.country ?? "";
  return (
    <ProfileEditor
      profile={{
        handle: profile.handle,
        name: profile.name,
        email: profile.email ?? "",
        imageUrl: profile.imageUrl ?? "",
        coverUrl: profile.coverUrl ?? "",
        city: profile.city ?? "",
        country: isCountryCode(country) ? country.toUpperCase() : "",
        headline: profile.headline ?? "",
        bio: profile.bio ?? "",
        websiteUrl: profile.websiteUrl ?? "",
        xUrl: profile.xUrl ?? "",
        githubUrl: profile.githubUrl ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        redditUrl: profile.redditUrl ?? "",
      }}
    />
  );
}

export const metadata = { title: 'Profile Settings', robots: { index: false, follow: false } };
