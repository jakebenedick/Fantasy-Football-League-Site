import { describe, expect, it } from "vitest";
import type { Roster } from "@/features/rosters";
import { colorFor, ordinal, teamLabel } from "./teamPresentation";

const roster = {
  roster_id: 7,
  owner_id: "owner-7",
  owner_display_name: "Jake",
  team_name: "Fourth Down",
} as Roster;

describe("dashboard presentation utilities", () => {
  it("marks the reigning champion without changing the base team name", () => {
    expect(teamLabel(roster)).toBe("Fourth Down");
    expect(teamLabel(roster, "owner-7")).toBe("Fourth Down 🏆");
  });

  it("returns stable colors and ordinal labels", () => {
    expect(colorFor("owner-7")).toBe(colorFor("owner-7"));
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(12)).toBe("12th");
  });
});
