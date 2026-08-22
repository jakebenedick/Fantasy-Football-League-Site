import type { DraftPick, Player } from "../types";

export function pickLabel(pick: DraftPick) {
  return pick.pick_number
    ? `${pick.season}, Round ${pick.round}, Pick ${pick.pick_number} overall`
    : `${pick.season} Round ${pick.round}`;
}

export function playerMatchesRosterSlot(
  player: Player | undefined,
  slot: string | null,
  group: string
) {
  if (!slot) return true;
  if (slot === "BN") return group === "bench";
  if (slot === "TAXI") return group === "taxi";
  if (slot === "IR") return group === "reserve";
  const eligible = new Set(
    [player?.position, ...(player?.eligible_positions ?? [])].filter(
      (position): position is string => Boolean(position)
    )
  );
  if (slot === "FLEX")
    return ["RB", "WR", "TE"].some((position) => eligible.has(position));
  if (slot === "SUPER_FLEX")
    return ["QB", "RB", "WR", "TE"].some((position) => eligible.has(position));
  if (slot === "REC_FLEX")
    return ["WR", "TE"].some((position) => eligible.has(position));
  return eligible.has(slot);
}
