"use client";

import { HandleSSOCallback } from "@clerk/react";
import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AuthStatusPanel } from "@/components/shell/auth-status-panel";
import { clerkMessage } from "@/components/shell/clerk-error";

const PROFILE_PATH = "/profile";

export function SsoCallback() {
  const [extra, setExtra] = useState<"sign-in" | "sign-up" | null>(null);

  if (extra === "sign-in") return <CallbackSecondFactor />;

  if (extra === "sign-up") {
    return (
      <AuthStatusPanel
        title="Finish creating your account"
        description="Google needs a couple more details. Start again from GameBits."
      >
        <Link href="/" className="mt-4 inline-block text-sm text-ice-signal">
          Back to GameBits
        </Link>
      </AuthStatusPanel>
    );
  }

  return (
    <AuthStatusPanel title="Signing you in" description="Taking you to your profile.">
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          const decorated = decorateUrl(PROFILE_PATH);
          window.location.assign(
            decorated.startsWith("http") ? decorated : new URL(decorated, window.location.origin).href,
          );
        }}
        navigateToSignIn={() => setExtra("sign-in")}
        navigateToSignUp={() => setExtra("sign-up")}
      />
    </AuthStatusPanel>
  );
}

function CallbackSecondFactor() {
  const { signIn } = useSignIn();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const sentCode = useRef(false);
  const strategy = signIn.supportedSecondFactors.some((factor) => factor.strategy === "totp")
    ? "totp"
    : signIn.supportedSecondFactors.some((factor) => factor.strategy === "backup_code")
      ? "backup_code"
      : "email_code";

  useEffect(() => {
    if (strategy !== "email_code" || sentCode.current) return;
    sentCode.current = true;
    void signIn.mfa.sendEmailCode().then(({ error: sendError }) => {
      if (sendError) setError(clerkMessage(sendError, "Could not send a code."));
    });
  }, [signIn, strategy]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result =
      strategy === "totp"
        ? await signIn.mfa.verifyTOTP({ code })
        : strategy === "backup_code"
          ? await signIn.mfa.verifyBackupCode({ code })
          : await signIn.mfa.verifyEmailCode({ code });
    if (result.error) {
      setPending(false);
      setError(clerkMessage(result.error, "That code didn't work."));
      return;
    }
    const finalized = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const decorated = decorateUrl(PROFILE_PATH);
        window.location.assign(
          decorated.startsWith("http") ? decorated : new URL(decorated, window.location.origin).href,
        );
      },
    });
    if (finalized.error) {
      setPending(false);
      setError(clerkMessage(finalized.error, "Sign-in could not be completed."));
    }
  }

  return (
    <AuthStatusPanel
      title="Enter your code"
      description={
        strategy === "totp"
          ? "Enter the code from your authenticator app."
          : strategy === "backup_code"
            ? "Enter one of your backup codes."
            : "Enter the code we sent to your email."
      }
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode="numeric"
          aria-label="Code"
          className="h-11 w-full rounded-xl border border-iron bg-graphite px-3 text-sm text-paper-white outline-none focus-visible:border-ice-signal focus-visible:ring-3 focus-visible:ring-ice-signal/40"
        />
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || code.trim().length === 0}
          className="flex h-11 w-full items-center justify-center rounded-full bg-ice-strong text-sm font-medium text-paper-white hover:bg-ice-strong/90 disabled:opacity-50"
        >
          {pending ? "Checking" : "Continue"}
        </button>
      </form>
    </AuthStatusPanel>
  );
}
