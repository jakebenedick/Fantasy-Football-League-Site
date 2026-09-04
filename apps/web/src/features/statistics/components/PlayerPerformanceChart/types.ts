import type { ScoringAudit } from "../../types";

export type PlayerPerformanceChartProps = {
  leagueId: string;
  playerId: string;
  playerName: string;
  season: number;
  availableSeasons: number[];
  requestedMetric?: string;
  requestToken?: number;
  embedded?: boolean;
  onClose?: () => void;
  initialHistory?: PlayerTrendHistory | null;
};

export type PlayerTrendPoint = {
  season: number;
  week: number | null;
  fantasy_points: number;
  statistics: ScoringAudit["players"][number]["statistics"];
};

export type PlayerTrendHistory = {
  league_id: string;
  player_id: string;
  first_season: number | null;
  last_season: number | null;
  seasons_scanned: number[];
  points: PlayerTrendPoint[];
};
