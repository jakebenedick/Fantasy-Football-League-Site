import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DynastyAssets } from "./DynastyAssets";

describe("DynastyAssets", () => {
  it("expands the league draft board inside the assets card", async () => {
    const user = userEvent.setup();
    render(
      <DynastyAssets
        picks={[]}
        leagueId="league-1"
        catalog={{}}
        rosters={[]}
      />
    );

    expect(screen.queryByText("Draft capital board")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /view full draft board/i }));
    expect(screen.getByText("Draft capital board")).toBeInTheDocument();
  });
});
