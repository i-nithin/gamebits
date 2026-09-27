import Image from "next/image";
import Link from "next/link";
import { MapPinIcon } from "lucide-react";

import { FollowButton } from "@/components/profile/follow-button";
import { Button } from "@/components/ui/button";
import { countryFlag, countryName, isCountryCode } from "@/lib/countries";
import { formatMemberSince } from "@/lib/profile";
import type { FollowState, PublicProfile } from "@/lib/types";

const SOCIALS = [
  { key: "websiteUrl", label: "Site" },
  { key: "xUrl", label: "X" },
  { key: "githubUrl", label: "GitHub" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "redditUrl", label: "Reddit" },
] as const;

export function ProfileHeader({
  profile,
  isOwner,
  email,
  follow,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  email: string | null;
  follow: FollowState;
}) {
  const countryLabel = profile.country
    ? isCountryCode(profile.country)
      ? `${countryFlag(profile.country)} ${countryName(profile.country)}`
      : profile.country
    : null;
  const place = [profile.city, countryLabel].filter(Boolean).join(", ");
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  const links = SOCIALS.flatMap((item) => {
    const href = profile[item.key];
    return href ? [{ href, label: item.label }] : [];
  });

  return (
    <section className="flex flex-col gap-5">
      <div className="relative h-40 overflow-hidden rounded-2xl border border-iron bg-graphite sm:h-56">
        {profile.coverUrl ? (
          <Image
            src={profile.coverUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1440px) 1392px, 100vw"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-4 px-1 sm:px-2">
        <div className="-mt-16 flex items-end justify-between gap-3 sm:-mt-20">
          <div className="relative size-24 overflow-hidden rounded-full border-4 border-void bg-slate sm:size-28">
            {profile.imageUrl ? (
              <Image
                src={profile.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-medium text-paper-white">
                {initial}
              </span>
            )}
          </div>
          {isOwner ? (
            <Button
              variant="outline"
              className="rounded-full"
              render={<Link href={`/u/${profile.handle}/edit`} />}
            >
              Edit profile
            </Button>
          ) : (
            <FollowButton profileUserId={profile.clerkUserId} following={follow.following} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium text-paper-white sm:text-[32px]">{profile.name}</h1>
          <p className="text-sm text-fog">@{profile.handle}</p>
          <p className="flex gap-3 text-sm text-fog">
            <Link href={`/u/${profile.handle}?tab=followers`} className="hover:text-paper-white">
              <span className="font-medium text-paper-white">{follow.followerCount}</span>{" "}
              {follow.followerCount === 1 ? "follower" : "followers"}
            </Link>
            <Link href={`/u/${profile.handle}?tab=following`} className="hover:text-paper-white">
              <span className="font-medium text-paper-white">{follow.followingCount}</span> following
            </Link>
          </p>
          {profile.headline ? (
            <p className="mt-1 text-base text-paper-white">{profile.headline}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 text-sm text-fog">
          {place ? (
            <p className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" />
              {place}
            </p>
          ) : null}
          <p>{formatMemberSince(profile.joinedAt)}</p>
          {isOwner && email ? (
            <p>
              {email}
              <span className="ml-2 text-xs tracking-wide uppercase">Only visible to you</span>
            </p>
          ) : null}
        </div>
        {links.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-iron px-3 py-1 text-sm text-paper-white hover:bg-slate"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        {profile.bio ? (
          <p className="max-w-2xl text-sm whitespace-pre-wrap text-paper-white">{profile.bio}</p>
        ) : null}
      </div>
    </section>
  );
}
