import type { PlayerHistory } from "@/features/transactions";
import type { ScoringAudit } from "../../types";

export type PlayerStatisticsCardProps = {
  player: ScoringAudit["players"][number];
  season: number;
  week: number | null;
  tab: "statistics" | "transactions";
  onTabChange: (tab: "statistics" | "transactions") => void;
  history: PlayerHistory | null;
};
