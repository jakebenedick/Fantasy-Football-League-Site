export type DraftPick = {
  season: string;
  round: number;
  original_roster_id: number;
  original_owner_name: string | null;
  pick_number: number | null;
  acquired: boolean;
};

export type Roster = {
  roster_id: number;
  owner_id: string | null;
  owner_display_name: string | null;
  team_name: string | null;
  owner_avatar_url: string | null;
  players: string[];
  starters: string[];
  taxi: string[];
  reserve: string[];
  settings: Record<string, number | null>;
  draft_picks: DraftPick[];
};

export type Player = {
  player_id: string;
  full_name: string;
  nfl_team: string | null;
  position: string | null;
  eligible_positions: string[];
  status: string | null;
  injury_status: string | null;
  number: number | null;
  avatar_url: string | null;
  is_og: boolean;
  og_drafted_season: string | null;
  og_pick_number: number | null;
};
