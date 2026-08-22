import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LeaguePicker } from "./LeaguePicker";

const league = {
  league_id: "league-1",
  name: "Dynasty League",
  season: "2026",
  status: "in_season",
  total_rosters: 10,
  roster_positions: ["QB", "RB", "WR", "BN"],
  taxi_slots: 3,
  avatar_url: null,
};

describe("LeaguePicker", () => {
  it("returns the selected league", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <LeaguePicker
        username="jake"
        season={2026}
        leagues={[league]}
        loading={false}
        error=""
        onSelect={onSelect}
        onBack={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Dynasty League/i }));
    expect(onSelect).toHaveBeenCalledWith(league);
  });
});
