import { getJson } from "@/services";
import type { PlayerTrendHistory } from "../components/PlayerPerformanceChart/types";

const historyRequests = new Map<string, Promise<PlayerTrendHistory>>();

export function getPlayerTrendHistory(
  leagueId: string,
  playerId: string,
  endSeason: number
) {
  const key = `${leagueId}:${playerId}:2008:${endSeason}`;
  const cached = historyRequests.get(key);
  if (cached) return cached;
  const request = getJson<PlayerTrendHistory>(
    `/api/v1/sleeper/leagues/${leagueId}/players/${encodeURIComponent(playerId)}/statistics-history?start_season=2008&end_season=${endSeason}`
  ).catch((error) => {
    historyRequests.delete(key);
    throw error;
  });
  historyRequests.set(key, request);
  return request;
}
