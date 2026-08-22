import type { League } from "@/features/onboarding";
import type { ScoringAudit } from "../../types";

export type StatisticsViewProps = {
  league: League;
  initialAudit: ScoringAudit | null;
};
