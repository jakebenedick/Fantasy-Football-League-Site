import type { RosterStatus } from "../../types";

export type StatisticsFiltersProps = {
  search: string;
  position: string;
  rosterStatus: RosterStatus;
  eligiblePositions: string[];
  playerCount: number;
  onSearchChange: (search: string) => void;
  onPositionChange: (position: string) => void;
  onRosterStatusChange: (status: RosterStatus) => void;
};
