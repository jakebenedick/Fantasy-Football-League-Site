export type HistoryTeam = {
  roster_id: number;
  owner_id: string | null;
  manager_name: string;
  team_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  champion: boolean;
  finish_position: number | null;
  avatar_url: string | null;
};

export type LeagueHistory = {
  seasons: {
    league_id: string;
    season: string;
    teams: HistoryTeam[];
    bracket: {
      round: number;
      match_id: number;
      team_1_roster_id: number | null;
      team_2_roster_id: number | null;
      winner_roster_id: number | null;
      loser_roster_id: number | null;
      placement: number | null;
    }[];
  }[];
};
