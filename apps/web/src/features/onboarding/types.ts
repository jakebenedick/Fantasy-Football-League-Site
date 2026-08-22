export type League = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  taxi_slots: number;
  avatar_url: string | null;
};

export type User = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};
