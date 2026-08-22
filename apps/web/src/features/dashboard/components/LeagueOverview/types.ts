import type { Roster } from "@/features/rosters";
import type { LeagueActivity } from "@/features/transactions";

export type LeagueOverviewProps = {
  activity: LeagueActivity | null;
  loading: boolean;
  rosters: Roster[];
  onOpenRoster: (rosterId: number) => void;
  championOwnerId?: string | null;
};
