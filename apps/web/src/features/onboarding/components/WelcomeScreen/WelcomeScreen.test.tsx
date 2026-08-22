import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WelcomeScreen } from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("collects a Sleeper username and submits the setup form", async () => {
    const user = userEvent.setup();
    const onUsernameChange = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <WelcomeScreen
        username=""
        season={2026}
        loading={false}
        error=""
        onUsernameChange={onUsernameChange}
        onSeasonChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByLabelText("Sleeper username");
    await user.type(input, "jake");
    expect(onUsernameChange).toHaveBeenCalled();

    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("announces an API error", () => {
    render(
      <WelcomeScreen
        username="jake"
        season={2026}
        loading={false}
        error="No user found"
        onUsernameChange={vi.fn()}
        onSeasonChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No user found");
  });
});
