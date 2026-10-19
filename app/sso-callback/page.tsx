import type { Metadata } from "next";

import { SsoCallback } from "@/components/shell/sso-callback";

export const metadata: Metadata = {
  title: "Signing in · GameBits",
};

export default function SsoCallbackPage() {
  return <SsoCallback />;
}
