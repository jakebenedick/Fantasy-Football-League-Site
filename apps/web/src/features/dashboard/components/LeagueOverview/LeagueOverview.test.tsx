import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Roster } from "@/features/rosters";
import type { LeagueActivity } from "@/features/transactions";
import { LeagueOverview } from "./LeagueOverview";

const roster: Roster = {
  roster_id: 1,
  owner_id: "owner-1",
  owner_display_name: "Jake",
  team_name: "Fourth Down",
  owner_avatar_url: null,
  players: [], starters: [], taxi: [], reserve: [], draft_picks: [],
  settings: { wins: 1, losses: 0, ties: 0, fpts: 120, fpts_decimal: 50 },
};

const activity: LeagueActivity = {
  teams: [{
    owner_id: "owner-1", manager_name: "Jake", avatar_url: null,
    transactions: 10, trades: 3, all_time_points: 1200,
    highest_weekly_score: 180, highest_weekly_season: "2025", highest_weekly_week: 4,
    lowest_weekly_score: 70, lowest_weekly_season: "2024", lowest_weekly_week: 2,
  }],
  trade_pairs: [],
  seasons_scanned: ["2024", "2025"],
};

describe("LeagueOverview", () => {
  it("renders activity and live standings from feature data", () => {
    render(
      <LeagueOverview
        activity={activity}
        loading={false}
        rosters={[roster]}
        championOwnerId="owner-1"
        onOpenRoster={vi.fn()}
      />
    );

    expect(screen.getByText("Activity leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Live standings")).toBeInTheDocument();
    expect(screen.getByText("Fourth Down 🏆")).toBeInTheDocument();
  });
});
