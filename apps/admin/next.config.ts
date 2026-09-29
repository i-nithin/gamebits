import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(repoRoot, ".env") });
loadEnv({ path: resolve(repoRoot, ".env.local"), override: true });

function r2RemotePattern() {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    return { protocol: "https" as const, hostname: parsed.hostname };
  } catch {
    return null;
  }
}

const r2Pattern = r2RemotePattern();

const nextConfig: NextConfig = {
  transpilePackages: ["@gamebits/db", "@gamebits/auth", "@gamebits/core"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      ...(r2Pattern ? [r2Pattern] : []),
    ],
  },
};

export default nextConfig;
