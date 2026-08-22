import type { League, User } from "../onboarding/types";
import type { Player, Roster } from "../rosters/types";

export type LeagueContext = {
  league: League;
  selected_user: User;
  selected_roster: Roster | null;
  rosters: Roster[];
  players: Record<string, Player>;
  source: { provider: string; retrieved_at: string };
};
