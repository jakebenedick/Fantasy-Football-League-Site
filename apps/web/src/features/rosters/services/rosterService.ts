import { getJson } from "@/services";
import type { TeamHistory } from "@/features/transactions";

export function getTeamHistory(
  leagueId: string,
  ownerId: string,
  selectedUserId: string
) {
  return getJson<TeamHistory>(
    `/api/v1/sleeper/leagues/${leagueId}/team-history/${ownerId}?selected_user_id=${selectedUserId}`
  );
}
