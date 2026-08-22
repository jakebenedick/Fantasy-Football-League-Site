import { describe, expect, it } from "vitest";
import type { ScoringAudit } from "../types";
import { filterPlayers, formatMetric } from "./statistics";

const basePlayer: ScoringAudit["players"][number] = {
  sleeper_player_id: "1",
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
  statistics: {},
  value_outlook: null,
  breakdown: [],
};

describe("statistics utilities", () => {
  it("combines search, position, and ownership filters", () => {
    const availableReceiver = {
      ...basePlayer,
      sleeper_player_id: "2",
      player_name: "Available Receiver",
      manager_name: "Available",
      position: "WR",
      roster_id: null,
    };

    expect(
      filterPlayers([basePlayer, availableReceiver], {
        search: "receiver",
        position: "WR",
        rosterStatus: "available",
      })
    ).toEqual([availableReceiver]);
  });

  it("formats percentage and decimal metrics consistently", () => {
    expect(formatMetric(67.891, "percent")).toBe("67.9%");
    expect(formatMetric(4.567, "decimal")).toBe("4.57");
  });
});
