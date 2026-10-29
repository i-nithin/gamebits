import type { Metadata } from "next";

import { EmailLinkVerify } from "@/components/shell/email-link-verify";

export const metadata: Metadata = {
  title: "Verify your email",
};

export default function SignInVerifyPage() {
  return <EmailLinkVerify />;
}
