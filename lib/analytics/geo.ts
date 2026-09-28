import { isCountryCode } from "@/lib/countries";

export function countryFromHeaders(headers: Headers | { get(name: string): string | null }) {
  const raw =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code");
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code === "XX" || code === "T1") return null;
  return isCountryCode(code) ? code : null;
}
