import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("exposes account, league, and appearance settings", async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(
      <AppHeader
        theme="light"
        activeUsername="jake"
        selectedLeagueName="Dynasty League"
        showAccountContext
        canSwitchLeague
        onThemeChange={onThemeChange}
        onReset={vi.fn()}
        onSwitchLeague={vi.fn()}
      />
    );

    await user.click(screen.getByLabelText("Open settings"));
    expect(screen.getByText("Dynasty League")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dark/i }));
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });
});
