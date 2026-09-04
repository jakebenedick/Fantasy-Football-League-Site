import type { PlayerHistory } from "@/features/transactions";
import type { ScoringAudit } from "../../types";
import type { PlayerTrendHistory } from "../PlayerPerformanceChart/types";

export type PlayerStatisticsCardProps = {
  player: ScoringAudit["players"][number];
  season: number;
  week: number | null;
  tab: "statistics" | "transactions";
  onTabChange: (tab: "statistics" | "transactions") => void;
  history: PlayerHistory | null;
  availableSeasons?: number[];
  selectedSeason?: number;
  seasonLoading?: boolean;
  onSeasonChange?: (season: number) => void;
  leagueId?: string;
  trendHistory?: PlayerTrendHistory | null;
};
