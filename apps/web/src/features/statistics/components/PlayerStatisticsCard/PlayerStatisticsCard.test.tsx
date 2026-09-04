import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StatisticsPlayer } from "../../types";
import { PlayerStatisticsCard } from "./PlayerStatisticsCard";

const player: StatisticsPlayer = {
  sleeper_player_id: "player-1",
  nflverse_player_id: "nfl-1",
  player_name: "Josh Allen",
  roster_id: 1,
  manager_name: "Jake",
  position: "QB",
  avatar_url: null,
  matched: true,
  fantasy_points: 400,
  games: 17,
  overall_rank: 1,
  position_rank: 1,
  statistics: { pass_yd: 4000 },
  value_outlook: null,
  breakdown: [],
};

describe("PlayerStatisticsCard", () => {
  it("offers prior statistical seasons when used from a roster", async () => {
    const user = userEvent.setup();
    const onSeasonChange = vi.fn();

    render(
      <PlayerStatisticsCard
        player={player}
        season={2025}
        week={null}
        tab="statistics"
        onTabChange={vi.fn()}
        history={null}
        availableSeasons={[2025, 2024, 2023, 2022]}
        selectedSeason={2025}
        onSeasonChange={onSeasonChange}
      />
    );

    await user.selectOptions(
      screen.getByLabelText("Statistics season for Josh Allen"),
      "2023"
    );

    expect(onSeasonChange).toHaveBeenCalledWith(2023);
  });
});
