"use client";

import { useActionState, useRef, useState } from "react";
import { ImageUpIcon, Trash2Icon } from "lucide-react";

import { updateProfileAction } from "@/app/actions/profile";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { CountrySelect } from "@/components/profile/country-select";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { isCountryCode } from "@/lib/countries";
import { uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");
const inputClass = "h-9 rounded-lg border-iron bg-graphite";

type ProfileFormValues = {
  handle: string;
  name: string;
  email: string;
  imageUrl: string;
  coverUrl: string;
  city: string;
  country: string;
  headline: string;
  bio: string;
  websiteUrl: string;
  xUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  redditUrl: string;
};

function useUpload(
  purpose: "avatar" | "cover",
  onChange: (url: string) => void,
  onBusyChange: (busy: boolean) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      onChange(await uploadImage(file, purpose));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return { busy, error, upload };
}

function CoverPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, upload } = useUpload("cover", onChange, onBusyChange);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <p className="text-xs tracking-wide text-fog uppercase">Cover</p>
        <h2 className="text-lg font-medium text-paper-white">Profile cover</h2>
      </div>
      <div className="relative min-h-64 flex-1 overflow-hidden rounded-2xl border border-dashed border-iron bg-graphite">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="flex size-full min-h-64 flex-col items-center justify-center gap-2 text-fog">
            <ImageUpIcon className="size-6" />
            <span className="text-sm">Upload a cover image</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={busy}
          aria-label="Cover image"
          className="absolute inset-0 cursor-pointer opacity-0 disabled:pointer-events-none"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-void/70">
            <Spinner className="size-5 text-paper-white" />
          </div>
        ) : null}
        {value ? (
          <button
            type="button"
            aria-label="Remove cover"
            className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-void/80 text-paper-white"
            onClick={() => onChange("")}
            disabled={busy}
          >
            <Trash2Icon className="size-4" />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}

function AvatarPicker({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, upload } = useUpload("avatar", onChange, onBusyChange);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={value ? "Replace profile picture" : "Upload profile picture"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex size-14 items-center justify-center overflow-hidden rounded-full border border-iron bg-graphite sm:size-16",
          busy && "opacity-70",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImageUpIcon className="size-5 text-fog" />
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-void/70">
            <Spinner className="size-4 text-paper-white" />
          </span>
        ) : null}
      </button>
      {value ? (
        <button
          type="button"
          aria-label="Remove profile picture"
          className="absolute -top-1 -right-1 z-20 flex size-5 items-center justify-center rounded-full bg-void/80 text-paper-white"
          onClick={() => onChange("")}
          disabled={busy}
        >
          <Trash2Icon className="size-3" />
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      {error ? <p className="absolute top-full left-0 z-20 mt-1 w-40 text-xs text-error">{error}</p> : null}
    </div>
  );
}

export function ProfileEditor({ profile }: { profile: ProfileFormValues }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [imageUrl, setImageUrl] = useState(profile.imageUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);
  const [handle, setHandle] = useState(profile.handle);
  const [country, setCountry] = useState(
    isCountryCode(profile.country) ? profile.country.toUpperCase() : "",
  );
  const [uploading, setUploading] = useState(0);
  const profileHref = `/u/${profile.handle}`;

  function onBusyChange(busy: boolean) {
    setUploading((count) => count + (busy ? 1 : -1));
  }

  return (
    <GameFormShell
      breadcrumbs={[{ label: profile.name, href: profileHref }, { label: "Edit profile" }]}
      backHref={profileHref}
      cancelHref={profileHref}
      submitLabel="Save profile"
      pending={pending}
      uploading={uploading > 0}
      error={state?.error}
      formAction={(formData) => {
        action(formData);
      }}
      left={
        <CoverPicker value={coverUrl} onChange={setCoverUrl} onBusyChange={onBusyChange} />
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <input type="hidden" name="coverUrl" value={coverUrl} />
          <div className="flex items-center gap-4">
            <AvatarPicker value={imageUrl} onChange={setImageUrl} onBusyChange={onBusyChange} />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-medium text-paper-white sm:text-xl">Edit profile</h1>
              <p className="mt-1 text-sm text-fog">
                Update how you show up on GameBits. Your email stays private.
              </p>
            </div>
          </div>

          <FieldGroup className="gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <LabelWithInfo htmlFor="name" info="The name shown on your public profile.">
                  Name
                </LabelWithInfo>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={profile.name}
                  placeholder="Your name"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="handle" info="Your public address, like gamebits.app/u/name.">
                  Handle
                </LabelWithInfo>
                <Input
                  id="handle"
                  name="handle"
                  required
                  minLength={3}
                  maxLength={30}
                  spellCheck={false}
                  value={handle}
                  onChange={(event) =>
                    setHandle(
                      event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30),
                    )
                  }
                  placeholder="your_name"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field>
              <LabelWithInfo htmlFor="headline" info="A short line under your name.">
                Headline
              </LabelWithInfo>
              <Input
                id="headline"
                name="headline"
                maxLength={140}
                defaultValue={profile.headline}
                placeholder="What are you making?"
                className={inputClass}
              />
            </Field>
            <Field>
              <LabelWithInfo htmlFor="bio" info="A longer note for people visiting your profile.">
                Bio
              </LabelWithInfo>
              <Textarea
                id="bio"
                name="bio"
                maxLength={500}
                rows={5}
                defaultValue={profile.bio}
                placeholder="Tell people about your work"
                className="min-h-32 rounded-lg border-iron bg-graphite"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <LabelWithInfo htmlFor="city" info="City shown next to your country.">
                  City
                </LabelWithInfo>
                <Input
                  id="city"
                  name="city"
                  maxLength={80}
                  defaultValue={profile.city}
                  placeholder="City"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo info="Search for a country. The flag is shown on your profile.">
                  Country
                </LabelWithInfo>
                <CountrySelect value={country} onChange={setCountry} />
              </Field>
            </div>
            <Field>
              <LabelWithInfo htmlFor="email" info="Only you can see this. It comes from your account.">
                Email
              </LabelWithInfo>
              <Input
                id="email"
                value={profile.email}
                readOnly
                disabled
                className={inputClass}
              />
              <FieldDescription>Only visible to you.</FieldDescription>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <LabelWithInfo htmlFor="websiteUrl" info="A personal site or studio page.">
                  Personal site
                </LabelWithInfo>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={profile.websiteUrl}
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="xUrl" info="An https link on x.com or twitter.com.">
                  X
                </LabelWithInfo>
                <Input
                  id="xUrl"
                  name="xUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={profile.xUrl}
                  placeholder="https://x.com/"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="githubUrl" info="An https link on github.com.">
                  GitHub
                </LabelWithInfo>
                <Input
                  id="githubUrl"
                  name="githubUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={profile.githubUrl}
                  placeholder="https://github.com/"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="linkedinUrl" info="An https link on linkedin.com.">
                  LinkedIn
                </LabelWithInfo>
                <Input
                  id="linkedinUrl"
                  name="linkedinUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={profile.linkedinUrl}
                  placeholder="https://linkedin.com/in/"
                  className={inputClass}
                />
              </Field>
              <Field>
                <LabelWithInfo htmlFor="redditUrl" info="An https link on reddit.com.">
                  Reddit
                </LabelWithInfo>
                <Input
                  id="redditUrl"
                  name="redditUrl"
                  type="url"
                  maxLength={500}
                  defaultValue={profile.redditUrl}
                  placeholder="https://reddit.com/user/"
                  className={inputClass}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      }
    />
  );
}
