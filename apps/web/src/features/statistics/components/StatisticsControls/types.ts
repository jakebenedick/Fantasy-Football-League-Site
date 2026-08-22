import type { StatisticsDisplay } from "../../types";

export type StatisticsControlsProps = {
  leagueSeason: string;
  season: number;
  week: number | null;
  display: StatisticsDisplay;
  onSeasonChange: (season: number) => void;
  onWeekChange: (week: number | null) => void;
  onDisplayChange: (display: StatisticsDisplay) => void;
};
