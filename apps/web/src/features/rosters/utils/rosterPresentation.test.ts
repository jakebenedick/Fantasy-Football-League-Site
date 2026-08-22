import { describe, expect, it } from "vitest";
import type { DraftPick, Player } from "../types";
import { pickLabel, playerMatchesRosterSlot } from "./rosterPresentation";

const receiver = {
  position: "WR",
  eligible_positions: ["WR", "FLEX"],
} as Player;

describe("roster presentation utilities", () => {
  it("formats completed and future draft picks", () => {
    const pick = { season: "2026", round: 2, pick_number: 17 } as DraftPick;
    expect(pickLabel(pick)).toBe("2026, Round 2, Pick 17 overall");
    expect(pickLabel({ ...pick, pick_number: null })).toBe("2026 Round 2");
  });

  it("matches players and roster groups to league slots", () => {
    expect(playerMatchesRosterSlot(receiver, "WR", "starters")).toBe(true);
    expect(playerMatchesRosterSlot(receiver, "FLEX", "starters")).toBe(true);
    expect(playerMatchesRosterSlot(receiver, "QB", "starters")).toBe(false);
    expect(playerMatchesRosterSlot(receiver, "BN", "bench")).toBe(true);
  });
});
