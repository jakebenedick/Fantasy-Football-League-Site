import { getJson } from "@/services";
import type { LeagueActivity } from "@/features/transactions";
import type { LeagueHistory } from "../types";

export function getLeagueHistory(leagueId: string) {
  return getJson<LeagueHistory>(`/api/v1/sleeper/leagues/${leagueId}/history`);
}

export function getLeagueActivity(leagueId: string) {
  return getJson<LeagueActivity>(`/api/v1/sleeper/leagues/${leagueId}/activity`);
}
