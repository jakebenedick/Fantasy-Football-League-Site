export type ScoringAudit = {
  league_id: string;
  season: number;
  week: number | null;
  eligible_positions: string[];
  scoring_settings: Record<string, number>;
  supported_scoring_keys: string[];
  unsupported_scoring_keys: string[];
  total_players: number;
  matched_players: number;
  players_with_stats: number;
  statistic_catalog: {
    key: string;
    label: string;
    category: string;
    positions: string[];
    format: string;
  }[];
  outlook_status: string;
  players: {
    sleeper_player_id: string;
    nflverse_player_id: string | null;
    player_name: string;
    roster_id: number | null;
    manager_name: string;
    position: string | null;
    avatar_url: string | null;
    matched: boolean;
    fantasy_points: number;
    games: number;
    overall_rank: number | null;
    position_rank: number | null;
    statistics: Record<string, number>;
    value_outlook: {
      source: string;
      ranking_format: string;
      effective_at: string | null;
      ecr: number;
      position_rank: number | null;
      tier: number | null;
      best_rank: number | null;
      worst_rank: number | null;
      rank_standard_deviation: number | null;
      rank_delta: number | null;
    } | null;
    breakdown: {
      scoring_key: string;
      label: string;
      statistic: number;
      multiplier: number;
      points: number;
    }[];
  }[];
  source: { provider: string; retrieved_at: string };
};

export type StatisticsPlayer = ScoringAudit["players"][number];

export type MetricColumn = {
  key: string;
  label: string;
  category: string;
  format: string;
};

export type StatisticsDisplay = "total" | "perGame";
export type RosterStatus = "all" | "rostered" | "available";
export type StatisticsDetailTab = "statistics" | "transactions";
export type StatisticsRowLimit = 50 | 100 | 250 | "all";
export type StatisticsSort = {
  key: string;
  direction: "asc" | "desc";
};
