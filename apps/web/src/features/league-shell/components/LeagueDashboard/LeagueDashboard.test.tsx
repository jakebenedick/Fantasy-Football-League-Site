import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LeagueContext } from "../../types";
import { LeagueDashboard } from "./LeagueDashboard";

vi.mock("@/services", () => ({
  getJson: vi.fn((path: string) =>
    Promise.resolve(path.endsWith("/history") ? { seasons: [] } : {
      teams: [], trade_pairs: [], seasons_scanned: [],
    })
  ),
}));

const context: LeagueContext = {
  league: {
    league_id: "league-1",
    name: "Dynasty League",
    season: "2026",
    status: "in_season",
    total_rosters: 0,
    roster_positions: [],
    taxi_slots: 0,
    avatar_url: null,
  },
  selected_user: { user_id: "user-1", username: "jake", display_name: "Jake", avatar: null },
  selected_roster: null,
  rosters: [],
  players: {},
  source: { provider: "Sleeper", retrieved_at: "2026-08-22T12:00:00Z" },
};

describe("LeagueDashboard", () => {
  it("owns league navigation and empty-roster presentation", () => {
    render(
      <LeagueDashboard
        context={context}
        loading={false}
        error=""
        preloadedStatistics={null}
        refresh={vi.fn()}
        changeLeague={vi.fn()}
      />
    );

    expect(screen.getByText("Dynasty League")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "League views" })).toBeInTheDocument();
  });
});
