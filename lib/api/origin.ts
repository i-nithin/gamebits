export function documentedOrigin(configured = process.env.NEXT_PUBLIC_APP_URL) {
  if (!configured) return "";
  return configured.replace(/\/$/, "");
}

export function publicOrigin(host: string | null, proto: string | null) {
  const configured = documentedOrigin();
  if (configured) return configured;
  const hostname = host?.split(",")[0]?.trim();
  if (!hostname) return "";
  const protocol = proto?.split(",")[0]?.trim() || "https";
  return `${protocol}://${hostname}`;
}
