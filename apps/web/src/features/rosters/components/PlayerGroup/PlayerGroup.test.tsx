import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerGroup } from "./PlayerGroup";

describe("PlayerGroup", () => {
  it("renders an empty roster group without making API requests", () => {
    render(
      <PlayerGroup
        title="Taxi squad"
        group="taxi"
        playerIds={[]}
        catalog={{}}
        filter={null}
        leagueId="league-1"
        leagueSeason={2026}
      />
    );

    expect(screen.getByText("Taxi squad")).toBeInTheDocument();
    expect(screen.getByText("No players in this group.")).toBeInTheDocument();
  });
});
