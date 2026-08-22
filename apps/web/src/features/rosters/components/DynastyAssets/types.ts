import type { Player, Roster } from "../../types";

export type DynastyAssetsProps = {
  picks: Roster["draft_picks"];
  leagueId: string;
  catalog: Record<string, Player>;
  rosters: Roster[];
  championOwnerId?: string | null;
};
