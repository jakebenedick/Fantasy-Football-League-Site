import type { ScoringAudit } from "@/features/statistics";
import type { LeagueContext } from "../../types";

export type LeagueDashboardProps = {
  context: LeagueContext;
  loading: boolean;
  error: string;
  preloadedStatistics: ScoringAudit | null;
  refresh: () => void;
  changeLeague: () => void;
};
