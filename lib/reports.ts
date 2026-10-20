export const REPORT_DETAILS_MAX = 1000;

export const SYSTEM_ACTOR_ID = "gamebits";

export const REVIEW_REPORT_REASONS = [
  { id: "hateful", label: "Hateful or abusive language" },
  { id: "spam", label: "Spam or advertising" },
  { id: "off_topic", label: "Not about this game" },
  { id: "misleading", label: "Fake or misleading" },
  { id: "other", label: "Something else" },
] as const;

export const GAME_REPORT_CATEGORIES = [
  {
    id: "offensive",
    label: "Offensive or illegal content",
    description: "Hate, sexual content, violence, or something illegal.",
  },
  {
    id: "misleading",
    label: "Misleading or spam listing",
    description: "The listing is fake, spam, or not this game.",
  },
  {
    id: "copyright",
    label: "Copyright or IP",
    description: "The listing uses someone else's work.",
  },
  {
    id: "other",
    label: "Something else",
    description: "Pricing, a broken page, or another problem.",
  },
] as const;

export const GAME_OFFENSE_ISSUES = [
  { id: "hate", label: "Hate or harassment" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Violence" },
  { id: "illegal", label: "Illegal activity" },
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]["id"];
export type GameReportCategory = (typeof GAME_REPORT_CATEGORIES)[number]["id"];
export type GameOffenseIssue = (typeof GAME_OFFENSE_ISSUES)[number]["id"];
export type ReportTargetType = "review" | "game";

const REVIEW_REASON_IDS = new Set<string>(REVIEW_REPORT_REASONS.map((item) => item.id));
const GAME_CATEGORY_IDS = new Set<string>(GAME_REPORT_CATEGORIES.map((item) => item.id));
const OFFENSE_IDS = new Set<string>(GAME_OFFENSE_ISSUES.map((item) => item.id));

export function isReviewReportReason(value: string): value is ReviewReportReason {
  return REVIEW_REASON_IDS.has(value);
}

export function isGameReportReason(value: string) {
  if (value.startsWith("offensive:")) return OFFENSE_IDS.has(value.slice("offensive:".length));
  return GAME_CATEGORY_IDS.has(value) && value !== "offensive";
}

export function gameReportReason(category: GameReportCategory, issue: GameOffenseIssue | "") {
  if (category === "offensive") return `offensive:${issue}`;
  return category;
}

export function detailsRequired(targetType: ReportTargetType, reason: string) {
  if (targetType === "review") return reason === "other";
  return !reason.startsWith("offensive:");
}

export function reportReasonLabel(reason: string) {
  const review = REVIEW_REPORT_REASONS.find((item) => item.id === reason);
  if (review) return review.label;
  if (reason.startsWith("offensive:")) {
    const issue = GAME_OFFENSE_ISSUES.find((item) => item.id === reason.slice("offensive:".length));
    return issue ? `Offensive or illegal content · ${issue.label}` : "Offensive or illegal content";
  }
  const game = GAME_REPORT_CATEGORIES.find((item) => item.id === reason);
  return game?.label ?? "Report";
}
