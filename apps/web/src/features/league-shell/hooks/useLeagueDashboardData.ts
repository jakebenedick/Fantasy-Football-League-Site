import { useEffect, useMemo, useState } from "react";
import { getLeagueActivity, getLeagueHistory } from "@/features/dashboard/services";
import { getTeamHistory } from "@/features/rosters/services";
import type { LeagueHistory } from "@/features/dashboard";
import type { LeagueActivity, TeamHistory } from "@/features/transactions";

export type LeagueDashboardView = "overview" | "teams" | "scoring";

type DashboardDataOptions = {
  leagueId: string;
  selectedUserId: string;
  rosterOwnerId?: string | null;
  isMyTeam: boolean;
  view: LeagueDashboardView;
};

export function useLeagueDashboardData({
  leagueId,
  selectedUserId,
  rosterOwnerId,
  isMyTeam,
  view,
}: DashboardDataOptions) {
  const [activity, setActivity] = useState<LeagueActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [leagueHistory, setLeagueHistory] = useState<LeagueHistory | null>(null);
  const [leagueHistoryLoading, setLeagueHistoryLoading] = useState(false);
  const [teamHistory, setTeamHistory] = useState<TeamHistory | null>(null);
  const [teamHistoryLoading, setTeamHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLeagueHistory(null);
    setLeagueHistoryLoading(true);
    getLeagueHistory(leagueId)
      .then((value) => active && setLeagueHistory(value))
      .finally(() => active && setLeagueHistoryLoading(false));
    return () => { active = false; };
  }, [leagueId]);

  useEffect(() => {
    if (view !== "overview") return;
    let active = true;
    setActivity(null);
    setActivityLoading(true);
    getLeagueActivity(leagueId)
      .then((value) => active && setActivity(value))
      .finally(() => active && setActivityLoading(false));
    return () => { active = false; };
  }, [leagueId, view]);

  useEffect(() => {
    if (!rosterOwnerId || isMyTeam) {
      setTeamHistory(null);
      setTeamHistoryLoading(false);
      return;
    }
    let active = true;
    setTeamHistory(null);
    setTeamHistoryLoading(true);
    getTeamHistory(leagueId, rosterOwnerId, selectedUserId)
      .then((value) => active && setTeamHistory(value))
      .catch(() => active && setTeamHistory(null))
      .finally(() => active && setTeamHistoryLoading(false));
    return () => { active = false; };
  }, [isMyTeam, leagueId, rosterOwnerId, selectedUserId]);

  const reigningChampion = useMemo(
    () => leagueHistory?.seasons
      .flatMap((season) => season.teams
        .filter((team) => team.champion)
        .map((team) => ({ season: season.season, team })))
      .sort((a, b) => Number(b.season) - Number(a.season))[0] ?? null,
    [leagueHistory]
  );

  const championActivity = useMemo(() => {
    const championOwnerId = reigningChampion?.team.owner_id;
    if (!activity || !championOwnerId) return activity;
    const championName = activity.teams.find((team) => team.owner_id === championOwnerId)?.manager_name;
    const mark = (name: string) => name.endsWith(" 🏆") ? name : `${name} 🏆`;
    return {
      ...activity,
      teams: activity.teams.map((team) => team.owner_id === championOwnerId
        ? { ...team, manager_name: mark(team.manager_name) } : team),
      trade_pairs: activity.trade_pairs.map((pair) => ({
        ...pair,
        manager_names: pair.manager_names.map((name, index) =>
          pair.owner_ids[index] === championOwnerId ? mark(name) : name),
        trade_history: pair.trade_history.map((trade) => ({
          ...trade,
          sides: trade.sides.map((side) => championName && side.manager_name === championName
            ? { ...side, manager_name: mark(side.manager_name) } : side),
        })),
      })),
    };
  }, [activity, reigningChampion?.team.owner_id]);

  return {
    activity,
    activityLoading,
    leagueHistory,
    leagueHistoryLoading,
    teamHistory,
    teamHistoryLoading,
    reigningChampion,
    championActivity,
  };
}
