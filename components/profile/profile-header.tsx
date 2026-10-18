import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  MapPinIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { FollowButton } from "@/components/profile/follow-button";
import { ProfileBio } from "@/components/profile/profile-bio";
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

function ProfileAction({
  profile,
  isOwner,
  follow,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  follow: FollowState;
}) {
  if (isOwner) {
    return (
      <Button
        variant="outline"
        className="rounded-full border-white/15 bg-obsidian/70 px-4 backdrop-blur-sm hover:bg-graphite"
        nativeButton={false}
        render={<Link href="/settings/profile" />}
      >
        Edit profile
      </Button>
    );
  }

  return <FollowButton profileUserId={profile.clerkUserId} following={follow.following} />;
}

export function ProfileHeader({
  profile,
  isOwner,
  follow,
  gameCount,
  children,
}: {
  profile: PublicProfile;
  isOwner: boolean;
  follow: FollowState;
  gameCount: number;
  children: ReactNode;
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
    <section>
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-ice-soft via-charcoal to-obsidian sm:h-56 lg:h-64">
        {profile.coverUrl ? (
          <Image
            src={profile.coverUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <>
            <span className="absolute -top-20 left-[8%] size-72 rounded-full bg-ice-strong/10 blur-3xl" />
            <span className="absolute right-[12%] -bottom-28 size-80 rounded-full bg-slate/20 blur-3xl" />
          </>
        )}
        <span className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-page via-page/80 to-transparent sm:h-48" />
      </div>

      <div className="grid items-start gap-8 px-4 pb-10 sm:px-6 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-10 xl:px-10">
        <aside className="relative flex min-w-0 flex-col gap-5 md:sticky md:top-20 md:self-start">
          <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14 md:-mt-16">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-[5px] border-page bg-slate shadow-xl shadow-black/25 sm:size-28 lg:size-32">
              {profile.imageUrl ? (
                <Image
                  src={profile.imageUrl}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-2xl font-medium text-paper-white">
                  {initial}
                </span>
              )}
            </div>
            {!isOwner ? (
              <div className="shrink-0 pb-1">
                <ProfileAction profile={profile} isOwner={isOwner} follow={follow} />
              </div>
            ) : null}
          </div>

          <div className="flex max-w-2xl flex-col gap-1">
            <h1 className="truncate text-[1.75rem] font-semibold tracking-[-0.025em] text-paper-white sm:text-3xl">
              {profile.name}
            </h1>
            <p className="text-sm text-fog">@{profile.handle}</p>
            {profile.headline ? (
              <p className="mt-2 text-sm font-medium text-paper-white">{profile.headline}</p>
            ) : null}
            {profile.bio ? <ProfileBio bio={profile.bio} /> : null}
          </div>

          {isOwner ? (
            <div>
              <ProfileAction profile={profile} isOwner={isOwner} follow={follow} />
            </div>
          ) : null}

          <div className="grid max-w-sm grid-cols-3 gap-2 py-1 text-center">
            <span className="flex min-w-0 flex-col items-center gap-0.5">
              <span className="font-semibold text-paper-white tabular-nums">{gameCount}</span>
              <span className="text-[11px] text-fog lg:text-xs">
                {gameCount === 1 ? "Game" : "Games"}
              </span>
            </span>
            <Link
              href={`/u/${profile.handle}?tab=followers`}
              className="flex min-w-0 flex-col items-center gap-0.5 transition-colors hover:text-paper-white"
            >
              <span className="font-semibold text-paper-white tabular-nums">
                {follow.followerCount}
              </span>
              <span className="truncate text-[11px] text-fog lg:text-xs">
                {follow.followerCount === 1 ? "Follower" : "Followers"}
              </span>
            </Link>
            <Link
              href={`/u/${profile.handle}?tab=following`}
              className="flex min-w-0 flex-col items-center gap-0.5 transition-colors hover:text-paper-white"
            >
              <span className="font-semibold text-paper-white tabular-nums">
                {follow.followingCount}
              </span>
              <span className="text-[11px] text-fog lg:text-xs">Following</span>
            </Link>
          </div>

          <div className="flex flex-col gap-2 text-sm text-fog">
            {place ? (
              <p className="inline-flex items-center gap-1.5">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{place}</span>
              </p>
            ) : null}
            <p className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-4 shrink-0" />
              {formatMemberSince(profile.joinedAt)}
            </p>
          </div>

          {links.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-paper-white transition-colors hover:text-ice-signal focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal"
                >
                  {link.label}
                  <ArrowUpRightIcon className="size-3.5" />
                </a>
              ))}
            </div>
          ) : null}

        </aside>

        <div className="min-w-0 md:pt-3">{children}</div>
      </div>
    </section>
  );
}
