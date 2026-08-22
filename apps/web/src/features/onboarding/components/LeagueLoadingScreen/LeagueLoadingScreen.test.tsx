import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeagueLoadingScreen } from "./LeagueLoadingScreen";

describe("LeagueLoadingScreen", () => {
  it("shows the selected league and setup progress", () => {
    render(
      <LeagueLoadingScreen
        league={{
          league_id: "league-1",
          name: "Dynasty League",
          season: "2026",
          status: "in_season",
          total_rosters: 10,
          roster_positions: ["QB", "BN"],
          taxi_slots: 3,
          avatar_url: null,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Dynasty League" })).toBeInTheDocument();
    expect(screen.getByText("Connecting to Sleeper")).toBeInTheDocument();
  });
});
