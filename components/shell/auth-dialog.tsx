"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { createContext, useContext, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { clerkEnabled } from "@/lib/clerk-enabled";

const AuthDialogContext = createContext<() => void>(() => {});

const authAppearance = {
  variables: {
    colorBackground: "#141415",
    colorPrimary: "#83c3ff",
    colorForeground: "#ffffff",
    colorMutedForeground: "#acadae",
    colorInput: "#26272d",
    colorInputForeground: "#ffffff",
    colorNeutral: "#ffffff",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none",
    card: "bg-transparent shadow-none",
  },
} as const;

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
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  function handleOpenChange(next: boolean) {
    if (!next && window.location.hash.startsWith("#/")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (!next) setMode("sign-in");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-obsidian sm:max-w-[440px]">
        <DialogTitle className="sr-only">{mode === "sign-in" ? "Sign in" : "Sign up"}</DialogTitle>
        {open && mode === "sign-in" ? (
          <SignIn routing="hash" withSignUp fallbackRedirectUrl="/profile" appearance={authAppearance} />
        ) : null}
        {open && mode === "sign-up" ? (
          <SignUp routing="hash" fallbackRedirectUrl="/profile" appearance={authAppearance} />
        ) : null}
        <button
          type="button"
          className="text-sm text-fog hover:text-paper-white"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Create an account" : "Already have an account? Sign in"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
