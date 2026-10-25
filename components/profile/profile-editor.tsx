"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GlobeIcon, ImageUpIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { updateProfileAction } from "@/app/actions/profile";
import { CountrySelect } from "@/components/profile/country-select";
import { GitHubMark, LinkedInMark, RedditMark, XMark } from "@/components/settings/brand-marks";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { notifyError, notifySuccess } from "@/lib/notify";
import { uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");
const inputClass = "h-9 rounded-lg border-iron bg-graphite";

export type ProfileFormValues = {
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

function CoverField({
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
    <div className="relative h-[5.5rem] overflow-hidden bg-graphite">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
      ) : null}
      <button
        type="button"
        aria-label={value ? "Replace cover" : "Upload cover"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-void/80 text-paper-white"
      >
        <PencilIcon className="size-4" />
      </button>
      {value ? (
        <button
          type="button"
          aria-label="Remove cover"
          disabled={busy}
          onClick={() => onChange("")}
          className="absolute top-3 right-12 flex size-8 items-center justify-center rounded-full bg-void/80 text-paper-white"
        >
          <Trash2Icon className="size-4" />
        </button>
      ) : null}
      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center bg-void/70">
          <Spinner className="size-5 text-paper-white" />
        </div>
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
      {error ? <p className="absolute top-3 left-3 text-xs text-error">{error}</p> : null}
    </div>
  );
}

function AvatarField({
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
    <div className="absolute bottom-0 left-6 translate-y-1/2">
      <div className={cn("relative size-16", busy && "opacity-70")}>
        <div className="size-full overflow-hidden rounded-full border-4 border-obsidian bg-graphite">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-fog">
              <ImageUpIcon className="size-5" />
            </span>
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-void/70">
              <Spinner className="size-4 text-paper-white" />
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={value ? "Replace profile picture" : "Upload profile picture"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border border-iron bg-graphite text-paper-white"
        >
          <PencilIcon className="size-3.5" />
        </button>
      </div>
      {value ? (
        <button
          type="button"
          aria-label="Remove profile picture"
          disabled={busy}
          onClick={() => onChange("")}
          className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-void/85 text-paper-white"
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
      {error ? (
        <p className="absolute top-1 left-full ml-2 w-36 text-xs text-error">{error}</p>
      ) : null}
    </div>
  );
}

const linkClass = "h-9 border-0 bg-transparent shadow-none focus-visible:ring-0";

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const suffix = dot > 0 ? domain.slice(dot) : "";
  const localMask = `${local.slice(0, 1)}****`;
  const domainMask = `****${name.slice(-1)}`;
  return `${localMask}@${domainMask}${suffix}`;
}

function FormLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-paper-white">
      {children}
    </label>
  );
}

export function ProfileEditor({ profile }: { profile: ProfileFormValues }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const seen = useRef(state);
  const [imageUrl, setImageUrl] = useState(profile.imageUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);
  const [handle, setHandle] = useState(profile.handle);
  const [country, setCountry] = useState(profile.country);
  const [uploading, setUploading] = useState(0);

  function onBusyChange(busy: boolean) {
    setUploading((count) => count + (busy ? 1 : -1));
  }

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (!state) return;
    if ("error" in state) {
      notifyError("Couldn't save your profile.", state.error);
      return;
    }
    if ("saved" in state) notifySuccess("Profile saved.");
  }, [state]);

  return (
      <form
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        action={(formData) => {
          if (uploading > 0 || pending) return;
          return action(formData);
        }}
      >
        <input type="hidden" name="imageUrl" value={imageUrl} />
        <input type="hidden" name="coverUrl" value={coverUrl} />
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-iron bg-obsidian">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto w-full sm:w-[90%] md:w-[70%]">
              <div className="relative">
                <div className="overflow-hidden rounded-sm">
                  <CoverField value={coverUrl} onChange={setCoverUrl} onBusyChange={onBusyChange} />
                </div>
                <AvatarField value={imageUrl} onChange={setImageUrl} onBusyChange={onBusyChange} />
              </div>

              <div className="pt-12">
                <h1 className="text-xl font-medium text-paper-white">Edit Profile</h1>
                <p className="mt-1 text-sm text-fog">Your public profile on GameBits.</p>
              </div>

              <div className="mt-6 flex flex-col gap-6">
                <div>
                  <p className="mb-3 text-xs tracking-wide text-fog uppercase">About</p>
                  <FieldGroup className="gap-4 overflow-hidden rounded-sm border border-iron bg-page px-4 py-4">
                    <Field className="gap-1.5">
                      <FormLabel htmlFor="name">Name</FormLabel>
                      <Input
                        id="name"
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={profile.name}
                        placeholder="Your name"
                        autoComplete="name"
                        className={inputClass}
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FormLabel htmlFor="handle">Username</FormLabel>
                      <Input
                        id="handle"
                        name="handle"
                        required
                        minLength={3}
                        maxLength={30}
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={handle}
                        onChange={(event) =>
                          setHandle(
                            event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30),
                          )
                        }
                        placeholder="your_name"
                        className={inputClass}
                      />
                      <FieldDescription>This is your public username.</FieldDescription>
                    </Field>
                    <Field className="gap-1.5">
                      <FormLabel htmlFor="headline">Headline</FormLabel>
                      <Input
                        id="headline"
                        name="headline"
                        maxLength={140}
                        defaultValue={profile.headline}
                        placeholder="What are you making?"
                        className={inputClass}
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FormLabel htmlFor="bio">Bio</FormLabel>
                      <Textarea
                        id="bio"
                        name="bio"
                        maxLength={500}
                        rows={3}
                        defaultValue={profile.bio}
                        placeholder="Add a bio"
                        className="min-h-20 rounded-lg border-iron bg-graphite"
                      />
                    </Field>
                  </FieldGroup>
                </div>

                <div>
                  <p className="mb-3 text-xs tracking-wide text-fog uppercase">Location</p>
                  <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-sm border border-iron bg-page px-4 py-4 sm:grid-cols-2">
                    <Field className="gap-1.5">
                      <FormLabel htmlFor="city">City</FormLabel>
                      <Input
                        id="city"
                        name="city"
                        maxLength={80}
                        defaultValue={profile.city}
                        placeholder="City"
                        className={inputClass}
                      />
                    </Field>
                    <Field className="gap-1.5">
                      <FormLabel>Country</FormLabel>
                      <CountrySelect value={country} onChange={setCountry} />
                    </Field>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs tracking-wide text-fog uppercase">Links</p>
                  <div className="flex flex-col gap-3 overflow-hidden rounded-sm border border-iron bg-page px-4 py-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite">
                        <InputGroupAddon>
                          <GlobeIcon className="text-fog" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="websiteUrl"
                          name="websiteUrl"
                          type="url"
                          maxLength={500}
                          defaultValue={profile.websiteUrl}
                          placeholder="Add a URL"
                          aria-label="Personal site"
                          className={linkClass}
                        />
                      </InputGroup>
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite">
                        <InputGroupAddon>
                          <XMark className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="xUrl"
                          name="xUrl"
                          type="url"
                          maxLength={500}
                          defaultValue={profile.xUrl}
                          placeholder="https://x.com/"
                          aria-label="X"
                          className={linkClass}
                        />
                      </InputGroup>
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite">
                        <InputGroupAddon>
                          <GitHubMark className="size-4 text-paper-white" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="githubUrl"
                          name="githubUrl"
                          type="url"
                          maxLength={500}
                          defaultValue={profile.githubUrl}
                          placeholder="https://github.com/"
                          aria-label="GitHub"
                          className={linkClass}
                        />
                      </InputGroup>
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite">
                        <InputGroupAddon>
                          <LinkedInMark className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="linkedinUrl"
                          name="linkedinUrl"
                          type="url"
                          maxLength={500}
                          defaultValue={profile.linkedinUrl}
                          placeholder="https://linkedin.com/in/"
                          aria-label="LinkedIn"
                          className={linkClass}
                        />
                      </InputGroup>
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite md:col-span-2">
                        <InputGroupAddon>
                          <RedditMark className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="redditUrl"
                          name="redditUrl"
                          type="url"
                          maxLength={500}
                          defaultValue={profile.redditUrl}
                          placeholder="https://reddit.com/user/"
                          aria-label="Reddit"
                          className={linkClass}
                        />
                      </InputGroup>
                    </div>
                    <FieldDescription>Add a link to your website or social profile.</FieldDescription>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs tracking-wide text-fog uppercase">Email</p>
                  <Field className="gap-1.5 overflow-hidden rounded-sm border border-iron bg-page px-4 py-4">
                    <FormLabel htmlFor="email">Email Address</FormLabel>
                    <div className="relative">
                      <Input
                        id="email"
                        value={profile.email ? maskEmail(profile.email) : ""}
                        readOnly
                        disabled
                        placeholder="No email on this account"
                        className={cn(inputClass, profile.email && "pr-36")}
                      />
                      {profile.email ? (
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium tracking-wide text-success">
                          EMAIL VERIFIED
                        </span>
                      ) : null}
                    </div>
                    <FieldDescription>
                      For your security, your email address is currently masked.
                    </FieldDescription>
                  </Field>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center border-t border-iron bg-obsidian px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full justify-end sm:w-[90%] md:w-[70%]">
              <Button
                type="submit"
                disabled={pending || uploading > 0}
                className="rounded-full bg-ice-strong px-5 text-white hover:bg-ice-strong/90"
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </section>
      </form>
  );
}
