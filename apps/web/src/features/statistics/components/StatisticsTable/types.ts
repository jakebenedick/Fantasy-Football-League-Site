import type { PlayerHistory } from "@/features/transactions";
import type {
  MetricColumn,
  StatisticsDetailTab,
  StatisticsDisplay,
  StatisticsPlayer,
  StatisticsRowLimit,
  StatisticsSort,
} from "../../types";

export type StatisticsTableProps = {
  players: StatisticsPlayer[];
  totalPlayerCount: number;
  columns: MetricColumn[];
  display: StatisticsDisplay;
  sort: StatisticsSort;
  expandedPlayerId: string | null;
  detailTab: StatisticsDetailTab;
  histories: Record<string, PlayerHistory>;
  season: number;
  week: number | null;
  rowLimit: StatisticsRowLimit;
  onSortChange: (key: string) => void;
  onPlayerToggle: (playerId: string) => void;
  onDetailTabChange: (tab: StatisticsDetailTab) => void;
  onRowLimitChange: (limit: StatisticsRowLimit) => void;
};
