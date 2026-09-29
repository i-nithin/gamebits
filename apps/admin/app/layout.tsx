import { ClerkProvider, SignOutButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AdminShell } from "@/components/shell";
import { clerkEnabled, ensureBootstrapOwner, getCurrentUserId, getStaffRole } from "@gamebits/auth";

import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GameBits Admin",
  description: "Operator console for GameBits.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureBootstrapOwner();
  const userId = await getCurrentUserId();
  const role = userId ? await getStaffRole(userId) : null;

  const frame = !userId ? (
    <div className="flex min-h-dvh items-center justify-center p-6">{children}</div>
  ) : !role ? (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-white/10 bg-charcoal p-6">
        <h1 className="text-lg font-medium">No access</h1>
        <p className="mt-2 text-sm text-fog">
          This account is signed in, but it is not on the GameBits staff list.
        </p>
        <SignOutButton>
          <button type="button" className="mt-4 text-sm text-ice">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  ) : (
    <AdminShell role={role}>{children}</AdminShell>
  );

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        {clerkEnabled ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-in"
            appearance={{
              variables: { colorBackground: "#26272d", colorPrimary: "#83c3ff" },
            }}
          >
            {frame}
          </ClerkProvider>
        ) : (
          frame
        )}
      </body>
    </html>
  );
}
