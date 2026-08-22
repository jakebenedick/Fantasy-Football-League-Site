import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatisticsFilters } from "./StatisticsFilters";

describe("StatisticsFilters", () => {
  it("reports search, position, and ownership choices", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onPositionChange = vi.fn();
    const onRosterStatusChange = vi.fn();

    render(
      <StatisticsFilters
        search=""
        position="ALL"
        rosterStatus="all"
        eligiblePositions={["QB", "RB"]}
        playerCount={42}
        onSearchChange={onSearchChange}
        onPositionChange={onPositionChange}
        onRosterStatusChange={onRosterStatusChange}
      />
    );

    await user.type(screen.getByLabelText("Search stat leaders"), "Allen");
    await user.click(screen.getByRole("button", { name: "QB" }));
    await user.click(screen.getByRole("button", { name: "Available" }));

    expect(onSearchChange).toHaveBeenCalled();
    expect(onPositionChange).toHaveBeenCalledWith("QB");
    expect(onRosterStatusChange).toHaveBeenCalledWith("available");
    expect(screen.getByText("42 players")).toBeInTheDocument();
  });
});
