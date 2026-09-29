import { SignIn } from "@clerk/nextjs";

import { clerkEnabled } from "@gamebits/auth/clerk";

export default function SignInPage() {
  if (!clerkEnabled) {
    return <p className="text-sm text-fog">Clerk is not configured for this environment.</p>;
  }
  return <SignIn path="/sign-in" routing="path" />;
}
