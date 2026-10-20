export const TREND_STATE_ID = "current";
export const TREND_STALE_MS = 20 * 60 * 1000;
export const TREND_RAIL_LIMIT = 5;
export const TREND_LOCK_KEY = 84215047;

export const TREND_WEIGHTS = {
  visitor: 1,
  click: 3,
  like: 4,
  bookmark: 5,
  vote: 6,
  review: 8,
} as const;

export type TrendRegime = "sparse" | "growing" | "mature";

export type RegimeParams = {
  regime: TrendRegime;
  windowDays: number;
  halfLifeHours: number;
  prior: number;
  freshnessWeight: number;
  developerCap: number;
};

export const REGIMES: Record<TrendRegime, RegimeParams> = {
  sparse: {
    regime: "sparse",
    windowDays: 21,
    halfLifeHours: 24 * 7,
    prior: 8,
    freshnessWeight: 1.2,
    developerCap: Number.POSITIVE_INFINITY,
  },
  growing: {
    regime: "growing",
    windowDays: 14,
    halfLifeHours: 24 * 3,
    prior: 4,
    freshnessWeight: 0.6,
    developerCap: 3,
  },
  mature: {
    regime: "mature",
    windowDays: 7,
    halfLifeHours: 36,
    prior: 1.5,
    freshnessWeight: 0,
    developerCap: 2,
  },
};

const ENTER_GROWING_GAMES = 12;
const ENTER_GROWING_ACTIVITY = 20;
const EXIT_GROWING_GAMES = 10;
const EXIT_GROWING_ACTIVITY = 12;
const ENTER_MATURE_GAMES = 80;
const ENTER_MATURE_ACTIVITY = 200;
const EXIT_MATURE_GAMES = 60;
const EXIT_MATURE_ACTIVITY = 120;

export function selectRegime(
  gameCount: number,
  activity: number,
  previous: TrendRegime | null,
): TrendRegime {
  const current = previous ?? "sparse";

  if (current === "mature") {
    if (gameCount >= EXIT_MATURE_GAMES && activity >= EXIT_MATURE_ACTIVITY) return "mature";
    if (gameCount < EXIT_GROWING_GAMES || activity < EXIT_GROWING_ACTIVITY) return "sparse";
    return "growing";
  }

  if (current === "growing") {
    if (gameCount >= ENTER_MATURE_GAMES && activity >= ENTER_MATURE_ACTIVITY) return "mature";
    if (gameCount < EXIT_GROWING_GAMES || activity < EXIT_GROWING_ACTIVITY) return "sparse";
    return "growing";
  }

  if (gameCount >= ENTER_MATURE_GAMES && activity >= ENTER_MATURE_ACTIVITY) return "mature";
  if (gameCount >= ENTER_GROWING_GAMES && activity >= ENTER_GROWING_ACTIVITY) return "growing";
  return "sparse";
}

export const TREND_LOOKBACK_DAYS = 93;
