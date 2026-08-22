import type { DraftPick } from "../rosters/types";

export type TeamHistory = {
  seasons: {
    season: string;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    champion: boolean;
  }[];
  trades_with_selected_user: {
    transaction_id: string;
    season: string;
    created_at: string;
    sides: {
      roster_id: number;
      manager_name: string;
      player_ids_received: string[];
      draft_picks_received: DraftPick[];
    }[];
  }[];
  player_names: Record<string, string>;
};

export type PickHistory = {
  pick: DraftPick;
  current_owner_id: number;
  current_owner_name: string;
  transfers: {
    transaction_id: string;
    league_season: string;
    created_at: string;
    from_manager_name: string;
    to_manager_name: string;
    trade_sides: {
      roster_id: number;
      manager_name: string;
      player_ids_received: string[];
      draft_picks_received: DraftPick[];
    }[];
  }[];
  player_names: Record<string, string>;
};

export type PlayerEvent = {
  event_type: string;
  league_season: string;
  occurred_at: string | null;
  from_manager_name: string | null;
  to_manager_name: string | null;
  description: string;
  transaction_id: string | null;
  details: string[];
  sides: {
    roster_id: number;
    manager_name: string;
    assets_received: string[];
  }[];
};

export type PlayerHistory = {
  player_id: string;
  player_name: string;
  events: PlayerEvent[];
};

export type LeagueActivityTrade = {
  transaction_id: string;
  season: string;
  created_at: string;
  sides: { manager_name: string; assets_received: string[] }[];
};

export type LeagueActivity = {
  teams: {
    owner_id: string;
    manager_name: string;
    avatar_url: string | null;
    transactions: number;
    trades: number;
    all_time_points: number;
    highest_weekly_score: number | null;
    highest_weekly_season: string | null;
    highest_weekly_week: number | null;
    lowest_weekly_score: number | null;
    lowest_weekly_season: string | null;
    lowest_weekly_week: number | null;
  }[];
  trade_pairs: {
    owner_ids: string[];
    manager_names: string[];
    trades: number;
    trade_history: LeagueActivityTrade[];
  }[];
  seasons_scanned: string[];
};
