import { Badge } from "@/components/ui/badge";
import { AD_PHASE_LABELS, type AdPhase } from "@/lib/ads-month";

export function AdPhaseBadge({ phase }: { phase: AdPhase }) {
  const variant =
    phase === "live" ? "secondary" : phase === "rejected" || phase === "removed" ? "destructive" : "outline";

  return <Badge variant={variant}>{AD_PHASE_LABELS[phase]}</Badge>;
}
