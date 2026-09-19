import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getIsoWeekUtc, weekHref } from "@/lib/iso-week";
import { listSearchableGames } from "@/lib/queries";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameBits",
  description: "A weekly board of interesting games.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const current = getIsoWeekUtc();
  const searchGames = await listSearchableGames().catch(() => []);

  const shell = (
    <AppShell
      currentWeekHref={weekHref(current.year, current.week)}
      searchGames={searchGames}
    >
      {children}
    </AppShell>
  );

  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        {clerkEnabled ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorBackground: "#26272d",
                colorPrimary: "#83c3ff",
              },
            }}
          >
            {shell}
          </ClerkProvider>
        ) : (
          shell
        )}
      </body>
    </html>
  );
}
