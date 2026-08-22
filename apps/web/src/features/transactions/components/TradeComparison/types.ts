import type { PlayerEvent } from "../../types";

export type TradeComparisonProps = {
  sides: PlayerEvent["sides"];
  transactionId: string | null;
};
