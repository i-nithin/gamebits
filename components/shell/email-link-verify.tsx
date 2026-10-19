"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AuthStatusPanel } from "@/components/shell/auth-status-panel";

const PROFILE_PATH = "/profile";

type VerifyStatus = "loading" | "verified" | "expired" | "failed" | "mismatch";

function verificationStatus(
  isLoaded: boolean,
  status: "verified" | "expired" | "failed" | "client_mismatch" | undefined,
  missingLink: boolean,
): VerifyStatus {
  if (!isLoaded || !status) return missingLink ? "failed" : "loading";
  if (status === "expired") return "expired";
  if (status === "client_mismatch") return "mismatch";
  if (status === "failed") return "failed";
  return "verified";
}

export function EmailLinkVerify() {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [finalizeFailed, setFinalizeFailed] = useState(false);
  const [missingLink, setMissingLink] = useState(false);
  const started = useRef(false);
  const verification = signIn.emailLink.verification ?? signUp.verifications.emailLinkVerification;
  const completing =
    verification?.status === "verified" &&
    (signIn.status === "complete" || signUp.status === "complete") &&
    !finalizeFailed;
  const status = completing ? "loading" : verificationStatus(isLoaded, verification?.status, missingLink);

  useEffect(() => {
    if (!isLoaded || verification) return;
    const timer = window.setTimeout(() => setMissingLink(true), 2500);
    return () => window.clearTimeout(timer);
  }, [isLoaded, verification]);

  useEffect(() => {
    if (!isLoaded || !verification || verification.status !== "verified" || started.current) return;
    const attempt = signIn.status === "complete" ? signIn : signUp.status === "complete" ? signUp : null;
    if (!attempt) return;
    started.current = true;
    void attempt
      .finalize({
        navigate: ({ decorateUrl }) => {
          const decorated = decorateUrl(PROFILE_PATH);
          window.location.assign(decorated.startsWith("http") ? decorated : new URL(decorated, window.location.origin).href);
        },
      })
      .then(({ error }) => {
        if (error) setFinalizeFailed(true);
      });
  }, [isLoaded, signIn, signUp, verification]);

  if (finalizeFailed) {
    return (
      <AuthStatusPanel
        title="Sign-in could not be finished"
        description="Go back and try again."
      >
        <Link href="/" className="mt-4 inline-block text-sm text-ice-signal">
          Back to GameBits
        </Link>
      </AuthStatusPanel>
    );
  }

  if (status === "expired") {
    return (
      <AuthStatusPanel
        title="This link expired"
        description="Request a new link from the sign-in dialog."
      />
    );
  }

  if (status === "mismatch") {
    return (
      <AuthStatusPanel
        title="Open the link on the same device"
        description="Finish signing in in the browser where you entered your email."
      />
    );
  }

  if (status === "failed") {
    return (
      <AuthStatusPanel title="This link didn't work" description="Go back and request a new one.">
        <Link href="/" className="mt-4 inline-block text-sm text-ice-signal">
          Back to GameBits
        </Link>
      </AuthStatusPanel>
    );
  }

  if (status === "verified") {
    return (
      <AuthStatusPanel
        title="You're signed in"
        description="You can close this tab. GameBits is open on your other tab."
      />
    );
  }

  return <AuthStatusPanel title="Checking your link" description="This only takes a moment." />;
}
