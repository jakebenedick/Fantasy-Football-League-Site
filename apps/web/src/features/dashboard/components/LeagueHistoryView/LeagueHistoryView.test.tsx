import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { LeagueHistory } from "../../types";
import { LeagueHistoryView } from "./LeagueHistoryView";

const history: LeagueHistory = {
  seasons: [{
    league_id: "league-2025",
    season: "2025",
    teams: [{
      roster_id: 1, owner_id: "owner-1", manager_name: "Jake",
      team_name: "Fourth Down", wins: 10, losses: 4, ties: 0,
      points: 1800, champion: true, finish_position: 1, avatar_url: null,
    }],
    bracket: [],
  }],
};

describe("LeagueHistoryView", () => {
  it("keeps the archive compact until the user expands it", async () => {
    const user = userEvent.setup();
    render(<LeagueHistoryView history={history} loading={false} />);

    expect(screen.queryByText("Finish trends")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /league history/i }));
    expect(screen.getByText("Finish trends")).toBeInTheDocument();
    expect(screen.getAllByText("2025")).not.toHaveLength(0);
  });
});
