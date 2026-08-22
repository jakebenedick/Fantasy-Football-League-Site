import type { League } from "../../types";

export type LeaguePickerProps = {
  username: string;
  season: number;
  leagues: League[];
  loading: boolean;
  error: string;
  onSelect: (league: League) => void;
  onBack: () => void;
};
