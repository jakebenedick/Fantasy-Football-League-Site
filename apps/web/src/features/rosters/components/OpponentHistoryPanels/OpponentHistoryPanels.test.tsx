import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TeamHistory } from "@/features/transactions";
import { OpponentHistoryPanels } from "./OpponentHistoryPanels";

const history: TeamHistory = {
  seasons: [{ season: "2025", wins: 10, losses: 4, ties: 0, points: 1800, champion: true }],
  trades_with_selected_user: [{
    transaction_id: "trade-1",
    season: "2025",
    created_at: "2025-08-01T00:00:00Z",
    sides: [{
      roster_id: 1,
      manager_name: "Jake",
      player_ids_received: ["player-1"],
      draft_picks_received: [],
    }],
  }],
  player_names: { "player-1": "Josh Allen" },
};

describe("OpponentHistoryPanels", () => {
  it("keeps prior seasons and direct trades together", () => {
    render(<OpponentHistoryPanels history={history} loading={false} catalog={{}} />);

    expect(screen.getByText("Previous seasons")).toBeInTheDocument();
    expect(screen.getByText("Trades with you")).toBeInTheDocument();
    expect(screen.getByText("Josh Allen")).toBeInTheDocument();
  });
});
