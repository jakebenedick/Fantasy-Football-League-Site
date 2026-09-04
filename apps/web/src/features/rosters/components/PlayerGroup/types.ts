import type { Player } from "../../types";
import type { ScoringAudit } from "@/features/statistics";

export type PlayerGroupProps = {
  title: string;
  group: "starters" | "bench" | "taxi" | "reserve";
  playerIds: string[];
  catalog: Record<string, Player>;
  filter: string | null;
  accent?: boolean;
  leagueId: string;
  leagueSeason: number;
  initialStatistics?: ScoringAudit | null;
};
