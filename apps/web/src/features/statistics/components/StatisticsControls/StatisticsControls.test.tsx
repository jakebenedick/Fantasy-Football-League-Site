import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatisticsControls } from "./StatisticsControls";

describe("StatisticsControls", () => {
  it("reports period and display changes", async () => {
    const user = userEvent.setup();
    const onWeekChange = vi.fn();
    const onDisplayChange = vi.fn();

    render(
      <StatisticsControls
        leagueSeason="2026"
        season={2025}
        week={null}
        display="total"
        onSeasonChange={vi.fn()}
        onWeekChange={onWeekChange}
        onDisplayChange={onDisplayChange}
      />
    );

    await user.selectOptions(screen.getByLabelText("Period"), "3");
    await user.selectOptions(screen.getByLabelText("Display"), "perGame");

    expect(onWeekChange).toHaveBeenCalledWith(3);
    expect(onDisplayChange).toHaveBeenCalledWith("perGame");
  });
});
