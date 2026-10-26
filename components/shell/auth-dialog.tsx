"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MailIcon, XIcon } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { clerkErrorCode, clerkMessage } from "@/components/shell/clerk-error";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { cn } from "@/lib/utils";

const AuthDialogContext = createContext<() => void>(() => {});
const PROFILE_PATH = "/profile";
const LAST_METHOD_KEY = "gamebits:last-auth";
const IDENTIFIER_NOT_FOUND = "form_identifier_not_found";
const IDENTIFIER_EXISTS = "form_identifier_exists";

type Mode = "sign-in" | "sign-up";
type Step = "form" | "check-email" | "second-factor";
type LastMethod = "google" | "email";
type SecondFactorStrategy = "email_code" | "totp" | "backup_code";

export function useAuthDialog() {
  return useContext(AuthDialogContext);
}

export function AuthDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AuthDialogContext.Provider value={() => setOpen(true)}>
      {children}
      {clerkEnabled ? <AuthDialog open={open} onOpenChange={setOpen} /> : null}
    </AuthDialogContext.Provider>
  );
}

function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigating = useRef(false);
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (wasSignedIn.current === null) {
      wasSignedIn.current = isSignedIn;
      return;
    }
    const becameSignedIn = !wasSignedIn.current && isSignedIn;
    wasSignedIn.current = isSignedIn;
    if (!open || !becameSignedIn || navigating.current) return;
    navigating.current = true;
    onOpenChange(false);
    window.location.assign(absoluteProfileUrl());
  }, [isLoaded, isSignedIn, onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-scrim backdrop-blur-none max-md:hidden" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex h-dvh w-full max-w-none translate-none flex-col justify-center rounded-none border-0 bg-obsidian px-6 py-6 text-paper-white outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sm md:border md:border-iron md:shadow-lg md:data-open:zoom-in-95 md:data-closed:zoom-out-95">
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-fog hover:bg-white/8 hover:text-paper-white"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
          <AuthForm
            open={open}
            navigating={navigating}
            onClose={() => onOpenChange(false)}
            onReopen={() => onOpenChange(true)}
          />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

function AuthForm({
  open,
  navigating,
  onClose,
  onReopen,
}: {
  open: boolean;
  navigating: { current: boolean };
  onClose: () => void;
  onReopen: () => void;
}) {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "google" | "email" | "code">(null);
  const pending = busy !== null;
  const [secondFactor, setSecondFactor] = useState<SecondFactorStrategy | null>(null);
  const cancelled = useRef(false);
  const lastMethod = open ? readLastMethod() : null;
  const [seenOpen, setSeenOpen] = useState(open);
  if (open !== seenOpen) {
    setSeenOpen(open);
    if (!open) {
      cancelled.current = true;
      setMode("sign-in");
      setStep("form");
      setError(null);
      setCode("");
      setSecondFactor(null);
      setBusy(null);
    }
  }

  const title = mode === "sign-in" ? "Sign in" : "Create an account";
  const description =
    mode === "sign-in"
      ? "Use Google or a code sent to your email."
      : "Google or an email code is enough to get started.";

  function goToProfile(decorateUrl: (url: string) => string) {
    navigating.current = true;
    onClose();
    window.location.assign(absoluteProfileUrl(decorateUrl));
  }

  async function finalizeSignIn() {
    const { error: finalizeError } = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        goToProfile(decorateUrl);
      },
    });
    if (finalizeError) {
      navigating.current = false;
      setStep("form");
      setError(clerkMessage(finalizeError));
      onReopen();
    }
  }

  async function finalizeSignUp() {
    const { error: finalizeError } = await signUp.finalize({
      navigate: ({ decorateUrl }) => {
        goToProfile(decorateUrl);
      },
    });
    if (finalizeError) {
      navigating.current = false;
      setStep("form");
      setError(clerkMessage(finalizeError));
      onReopen();
    }
  }

  async function beginSecondFactor() {
    const factor = pickSecondFactor(signIn.supportedSecondFactors);
    if (!factor) {
      setStep("form");
      setError("This account needs another verification step.");
      return;
    }
    if (factor === "email_code") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setStep("form");
        setError(clerkMessage(sendError));
        return;
      }
    }
    setSecondFactor(factor);
    setCode("");
    setStep("second-factor");
  }

  async function sendSignUpCode(address: string, allowTransfer: boolean) {
    const created = await signUp.create(
      signIn.isTransferable ? { transfer: true } : { emailAddress: address },
    );
    if (created.error) {
      if (allowTransfer && (signUp.isTransferable || clerkErrorCode(created.error) === IDENTIFIER_EXISTS)) {
        setMode("sign-in");
        await sendSignInCode(address, false);
        return;
      }
      setStep("form");
      setError(clerkMessage(created.error));
      return;
    }
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setStep("form");
      setError(clerkMessage(sent.error));
      return;
    }
    rememberMethod("email");
    setCode("");
    setStep("check-email");
  }

  async function sendSignInCode(address: string, allowTransfer: boolean) {
    const sent = await signIn.emailCode.sendCode({ emailAddress: address });
    if (sent.error || signIn.isTransferable) {
      if (allowTransfer && (signIn.isTransferable || clerkErrorCode(sent.error) === IDENTIFIER_NOT_FOUND)) {
        setMode("sign-up");
        await sendSignUpCode(address, false);
        return;
      }
      setStep("form");
      setError(sent.error ? clerkMessage(sent.error) : "Could not send the code.");
      return;
    }
    rememberMethod("email");
    setCode("");
    setStep("check-email");
  }

  async function finishAfterCode(kind: Mode) {
    if (kind === "sign-up") {
      if (signUp.existingSession) {
        goToProfile((url) => url);
        return;
      }
      if (signUp.status === "complete") {
        await finalizeSignUp();
        return;
      }
      setError("We need a few more details to finish creating this account.");
      return;
    }
    if (signIn.existingSession) {
      goToProfile((url) => url);
      return;
    }
    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      await beginSecondFactor();
      return;
    }
    if (signIn.status === "complete") {
      await finalizeSignIn();
      return;
    }
    setError("Sign-in could not be completed.");
  }

  async function onEmailCode(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded || pending || code.trim().length === 0) return;
    setError(null);
    setBusy("code");
    const result =
      mode === "sign-up"
        ? await signUp.verifications.verifyEmailCode({ code: code.trim() })
        : await signIn.emailCode.verifyCode({ code: code.trim() });
    if (result.error) {
      setBusy(null);
      setError(clerkMessage(result.error, "That code didn't work."));
      return;
    }
    await finishAfterCode(mode);
    setBusy(null);
  }

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded || pending) return;
    const address = email.trim();
    if (!address.includes("@")) {
      setError("Enter an email address.");
      return;
    }
    setError(null);
    setBusy("email");
    cancelled.current = false;
    try {
      if (mode === "sign-in") await sendSignInCode(address, true);
      else await sendSignUpCode(address, true);
    } catch (caught) {
      if (!cancelled.current) {
        setStep("form");
        setError(clerkMessage(caught));
      }
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    if (!isLoaded || pending) return;
    setError(null);
    setBusy("google");
    rememberMethod("google");
    const redirect = {
      strategy: "oauth_google" as const,
      redirectCallbackUrl: `${window.location.origin}/sso-callback`,
      redirectUrl: `${window.location.origin}${PROFILE_PATH}`,
    };
    const stuck = window.setTimeout(() => {
      setBusy((current) => (current === "google" ? null : current));
    }, 12000);
    try {
      const { error: ssoError } =
        mode === "sign-up" ? await signUp.sso(redirect) : await signIn.sso(redirect);
      if (ssoError) setError(clerkMessage(ssoError));
    } catch (caught) {
      setError(clerkMessage(caught));
    } finally {
      window.clearTimeout(stuck);
      setBusy(null);
    }
  }

  async function onSecondFactor(event: React.FormEvent) {
    event.preventDefault();
    if (!secondFactor || pending) return;
    setError(null);
    setBusy("code");
    const result =
      secondFactor === "email_code"
        ? await signIn.mfa.verifyEmailCode({ code })
        : secondFactor === "totp"
          ? await signIn.mfa.verifyTOTP({ code })
          : await signIn.mfa.verifyBackupCode({ code });
    if (result.error) {
      setBusy(null);
      setError(clerkMessage(result.error));
      return;
    }
    if (signIn.status === "complete") {
      await finalizeSignIn();
      setBusy(null);
      return;
    }
    setBusy(null);
    setError("Sign-in could not be completed.");
  }

  function useDifferentAddress() {
    cancelled.current = true;
    void signIn.reset();
    void signUp.reset();
    setStep("form");
    setError(null);
    setBusy(null);
  }

  return (
    <>
      <p className="text-xs tracking-wide text-fog uppercase">Account</p>
      {step === "check-email" ? (
        <form className="mt-4 flex flex-col gap-4" onSubmit={onEmailCode}>
          <div className="flex flex-col items-center text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-ice-soft text-ice-signal">
              <MailIcon className="size-5" />
            </span>
            <DialogTitle className="mt-4 text-xl font-medium text-paper-white">Check your email</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-paper-white">{email.trim()}</DialogDescription>
            <p className="mt-2 text-sm text-fog">Enter the code we sent. This dialog closes when you are signed in.</p>
          </div>
          <label className="flex flex-col gap-1.5" htmlFor="auth-email-code">
            <span className="text-sm text-paper-white">Code</span>
            <input
              id="auth-email-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button type="submit" disabled={pending || code.trim().length === 0} className={continueClass}>
            {pending ? <Spinner className="mr-2" /> : null}
            {pending ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            className="text-sm text-fog hover:text-paper-white"
            onClick={useDifferentAddress}
          >
            Use a different address
          </button>
        </form>
      ) : step === "second-factor" ? (
        <form className="mt-4 flex flex-col gap-4" onSubmit={onSecondFactor}>
          <DialogTitle className="text-xl font-medium text-paper-white">Enter your code</DialogTitle>
          <DialogDescription className="text-sm text-fog">{secondFactorCopy(secondFactor)}</DialogDescription>
          <label className="flex flex-col gap-1.5" htmlFor="auth-code">
            <span className="text-sm text-paper-white">Code</span>
            <input
              id="auth-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button type="submit" disabled={pending || code.trim().length === 0} className={continueClass}>
            {pending ? <Spinner className="mr-2" /> : null}
            {pending ? "Checking…" : "Continue"}
          </button>
        </form>
      ) : (
        <form className="mt-3 flex flex-col gap-4" noValidate onSubmit={onEmailSubmit}>
          <div>
            <DialogTitle className="text-xl font-medium text-paper-white">{title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-fog">{description}</DialogDescription>
          </div>
          <button
            type="button"
            disabled={!isLoaded || pending}
            onClick={() => {
              void onGoogle();
            }}
            className={cn(
              "relative flex h-11 w-full items-center justify-center gap-2 rounded-md border border-iron bg-graphite px-4 text-sm text-paper-white hover:bg-slate disabled:opacity-50",
              lastMethod === "google" && "pr-24",
            )}
          >
            {busy === "google" ? <Spinner /> : <GoogleMark />}
            {busy === "google" ? "Continuing…" : "Continue with Google"}
            {lastMethod === "google" ? <LastUsedChip className="absolute top-1/2 right-3 -translate-y-1/2" /> : null}
          </button>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-iron" />
            <span className="text-xs text-fog">or</span>
            <span className="h-px flex-1 bg-iron" />
          </div>
          <label className="flex flex-col gap-1.5" htmlFor="auth-email">
            <span className="text-sm text-paper-white">Email address</span>
            <input
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              placeholder="you@example.com"
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <div id="clerk-captcha" />
          <button
            type="submit"
            disabled={!isLoaded || pending}
            className={cn(continueClass, "relative", lastMethod === "email" && !pending && "pr-24")}
          >
            {busy === "email" ? <Spinner className="mr-2" /> : null}
            {busy === "email" ? "Sending code…" : "Continue"}
            {lastMethod === "email" && !pending ? (
              <LastUsedChip className="absolute top-1/2 right-3 -translate-y-1/2" />
            ) : null}
          </button>
          <p className="text-center text-sm text-fog">
            {mode === "sign-in" ? "New to GameBits?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-ice-signal"
              onClick={() => {
                setError(null);
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      )}
    </>
  );
}

function LastUsedChip({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-slate px-2 py-0.5 text-xs text-ice-signal", className)}>
      Last used
    </span>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

const fieldClass =
  "h-11 w-full rounded-md border border-iron bg-graphite px-3 text-sm text-paper-white outline-none placeholder:text-fog focus-visible:border-ice-signal focus-visible:ring-3 focus-visible:ring-ice-signal/40";

const continueClass =
  "flex h-11 w-full items-center justify-center rounded-md bg-ice-strong px-4 text-sm font-medium text-paper-white hover:bg-ice-strong/90 disabled:opacity-50";

function secondFactorCopy(strategy: SecondFactorStrategy | null) {
  if (strategy === "totp") return "Enter the code from your authenticator app.";
  if (strategy === "backup_code") return "Enter one of your backup codes.";
  return "Enter the code we sent to your email.";
}

function pickSecondFactor(
  factors: ReadonlyArray<{ strategy: string }>,
): SecondFactorStrategy | null {
  for (const strategy of ["email_code", "totp", "backup_code"] as const) {
    if (factors.some((factor) => factor.strategy === strategy)) return strategy;
  }
  return null;
}

function absoluteProfileUrl(decorateUrl?: (url: string) => string) {
  const decorated = decorateUrl ? decorateUrl(PROFILE_PATH) : PROFILE_PATH;
  if (decorated.startsWith("http")) return decorated;
  return new URL(decorated, window.location.origin).href;
}

function rememberMethod(method: LastMethod) {
  try {
    localStorage.setItem(LAST_METHOD_KEY, method);
  } catch {
    // Private browsing can reject storage writes.
  }
}

function readLastMethod(): LastMethod | null {
  try {
    const value = localStorage.getItem(LAST_METHOD_KEY);
    return value === "google" || value === "email" ? value : null;
  } catch {
    return null;
  }
}

