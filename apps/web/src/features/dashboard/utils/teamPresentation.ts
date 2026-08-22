import type { Roster } from "@/features/rosters";

export const TEAM_COLORS = [
  "#106b4d", "#d26b36", "#4569a3", "#9a5fa8", "#c99b22",
  "#3a9994", "#c94f6d", "#71805a", "#8a6047", "#5868d8",
];

export function teamLabel(roster: Roster, championOwnerId?: string | null) {
  const name = roster.team_name ?? roster.owner_display_name ?? `Team ${roster.roster_id}`;
  return `${name}${roster.owner_id === championOwnerId ? " 🏆" : ""}`;
}

export function colorFor(ownerId: string | null) {
  let hash = 0;
  for (const char of ownerId ?? "team")
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

export function ordinal(value: number) {
  const suffix =
    value % 10 === 1 && value % 100 !== 11 ? "st"
      : value % 10 === 2 && value % 100 !== 12 ? "nd"
      : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
}
