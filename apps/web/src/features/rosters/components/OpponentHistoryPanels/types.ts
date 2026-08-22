import type { TeamHistory } from "@/features/transactions";
import type { Player } from "../../types";

export type OpponentHistoryPanelsProps = {
  history: TeamHistory | null;
  loading: boolean;
  catalog: Record<string, Player>;
};
