import type { ScoringAudit } from "../types";

export const RATE_STAT_KEYS = new Set([
  "completion_pct",
  "pass_yd_per_att",
  "pass_td_rate",
  "int_rate",
  "yd_per_carry",
  "catch_rate",
  "yd_per_target",
  "yd_per_reception",
  "adot",
  "yac_per_reception",
  "target_share",
  "air_yd_share",
  "wopr",
  "racr",
  "yd_per_touch",
]);

export const STAT_LABELS: Record<string, string> = {
  pass_cmp: "Completions",
  pass_att: "Pass attempts",
  pass_yd: "Passing yards",
  pass_td: "Passing TD",
  pass_int: "Interceptions thrown",
  rush_att: "Carries",
  rush_yd: "Rushing yards",
  rush_td: "Rushing TD",
  rec: "Receptions",
  rec_yd: "Receiving yards",
  rec_td: "Receiving TD",
  fum_lost: "Fumbles lost",
  total_td: "Total touchdowns",
  sack: "Sacks",
  int: "Defensive interceptions",
  ff: "Forced fumbles",
  fum_rec: "Fumble recoveries",
  def_td: "Defensive TD",
  def_4_and_stop: "Fourth-down stops",
  blk_kick: "Blocked kicks",
  targets: "Targets",
  air_yd: "Air yards",
  yac: "Yards after catch",
  pass_epa: "Passing EPA",
  rush_epa: "Rushing EPA",
  rec_epa: "Receiving EPA",
  completion_pct: "Completion percentage",
  pass_yd_per_att: "Passing yards per attempt",
  pass_td_rate: "Passing TD rate",
  int_rate: "Interception rate",
  yd_per_carry: "Yards per carry",
  catch_rate: "Catch rate",
  yd_per_target: "Yards per target",
  yd_per_reception: "Yards per reception",
  adot: "Average depth of target",
  yac_per_reception: "YAC per reception",
  target_share: "Target share",
  air_yd_share: "Air-yards share",
  wopr: "WOPR",
  racr: "RACR",
  touches: "Touches",
  opportunities: "Opportunities",
  yd_per_touch: "Yards per touch",
};

export type StatisticsFilters = {
  search: string;
  position: string;
  rosterStatus: "all" | "rostered" | "available";
};

export function filterPlayers(
  players: ScoringAudit["players"],
  filters: StatisticsFilters
) {
  const query = filters.search.trim().toLowerCase();
  return players.filter((player) => {
    const matchesSearch =
      !query ||
      player.player_name.toLowerCase().includes(query) ||
      player.manager_name.toLowerCase().includes(query) ||
      (player.position ?? "").toLowerCase().includes(query);
    const matchesPosition =
      filters.position === "ALL" || player.position === filters.position;
    const matchesRoster =
      filters.rosterStatus === "all" ||
      (filters.rosterStatus === "rostered" && player.roster_id !== null) ||
      (filters.rosterStatus === "available" && player.roster_id === null);
    return matchesSearch && matchesPosition && matchesRoster;
  });
}

export function formatStatistic(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatMetric(value: number, format?: string) {
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "decimal")
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return formatStatistic(value);
}
