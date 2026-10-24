const JOBS = new Set([
  "purge-accounts",
  "expire-ad-checkouts",
  "recompute-trends",
]);

const job = process.argv[2];
if (!job || !JOBS.has(job)) {
  console.error(`Usage: node scripts/render-cron.mjs <${[...JOBS].join("|")}>`);
  process.exit(1);
}

const base = (process.env.CRON_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(
  /\/$/,
  "",
);
const secret = process.env.CRON_SECRET;
if (!base || !secret) {
  console.error("Set CRON_BASE_URL or NEXT_PUBLIC_APP_URL, and CRON_SECRET");
  process.exit(1);
}

const url = `${base}/api/cron/${job}`;
let response;
try {
  response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
} catch (error) {
  console.error(`${url}\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const body = await response.text();
if (!response.ok) {
  console.error(`${response.status} ${url}\n${body}`);
  process.exit(1);
}

console.log(body);
