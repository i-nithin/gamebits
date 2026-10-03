"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

export function SignOutExpired() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/" });
  }, [signOut]);

  return null;
}
