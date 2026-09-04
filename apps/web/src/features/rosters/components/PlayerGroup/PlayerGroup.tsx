/* eslint-disable @next/next/no-img-element -- Sleeper player avatars are CDN-sized. */
import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { PlayerStatisticsCard, type ScoringAudit } from "@/features/statistics";
import type { PlayerTrendHistory } from "@/features/statistics/components/PlayerPerformanceChart";
import { getPlayerTrendHistory } from "@/features/statistics/services";
import type { PlayerHistory } from "@/features/transactions";
import { getJson } from "@/services";
import { playerMatchesRosterSlot } from "../../utils";
import type { PlayerGroupProps } from "./types";
export function PlayerGroup({
  title,
  group,
  playerIds,
  catalog,
  filter,
  accent = false,
  leagueId,
  leagueSeason,
  initialStatistics = null,
}: PlayerGroupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animationParent] = useAutoAnimate<HTMLDivElement>();
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [statistics, setStatistics] = useState<ScoringAudit | null>(null);
  const [statisticsBySeason, setStatisticsBySeason] = useState<
    Record<number, ScoringAudit>
  >({});
  const [trendHistoryByPlayer, setTrendHistoryByPlayer] = useState<
    Record<string, PlayerTrendHistory>
  >({});
  const defaultStatisticsSeason = Math.max(2008, leagueSeason - 1);
  const [selectedStatisticsSeason, setSelectedStatisticsSeason] = useState(
    defaultStatisticsSeason
  );
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] = useState("");
  const [detailTab, setDetailTab] = useState<"statistics" | "transactions">(
    "statistics"
  );
  async function inspect(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setHistory(null);
      setStatistics(null);
      setStatisticsBySeason({});
      return;
    }
    setSelectedId(id);
    setHistory(null);
    const initializedStatistics =
      initialStatistics?.season === defaultStatisticsSeason
        ? initialStatistics
        : null;
    setStatistics(initializedStatistics);
    setStatisticsBySeason(
      initializedStatistics
        ? { [defaultStatisticsSeason]: initializedStatistics }
        : {}
    );
    setSelectedStatisticsSeason(defaultStatisticsSeason);
    setStatisticsError("");
    setDetailTab("statistics");
    getPlayerTrendHistory(leagueId, id, defaultStatisticsSeason)
      .then((trendHistory) => {
        setTrendHistoryByPlayer((current) => ({ ...current, [id]: trendHistory }));
        const activeSeasons = Array.from(
          new Set(
            trendHistory.points
              .filter((point) => point.week === null)
              .map((point) => point.season)
          )
        ).sort((left, right) => right - left);
        if (
          activeSeasons.length &&
          !activeSeasons.includes(defaultStatisticsSeason)
        ) {
          void selectStatisticsSeason(activeSeasons[0]);
        }
      })
      .catch(() => undefined);
    const historyRequest = getJson<PlayerHistory>(
      `/api/v1/sleeper/leagues/${leagueId}/player-history/${id}`
    )
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => undefined);

    if (!initializedStatistics) {
      setStatisticsLoading(true);
      try {
        const leagueStatistics = await getJson<ScoringAudit>(
          `/api/v1/sleeper/leagues/${leagueId}/statistics?season=${defaultStatisticsSeason}`
        );
        setStatistics(leagueStatistics);
        setStatisticsBySeason({
          [defaultStatisticsSeason]: leagueStatistics,
        });
      } catch (reason) {
        setStatisticsError(
          reason instanceof Error ? reason.message : "Unable to load player statistics."
        );
      } finally {
        setStatisticsLoading(false);
      }
    }
    await historyRequest;
  }

  async function selectStatisticsSeason(season: number) {
    setSelectedStatisticsSeason(season);
    setStatisticsError("");
    const cachedStatistics = statisticsBySeason[season];
    if (cachedStatistics) {
      setStatistics(cachedStatistics);
      return;
    }
    setStatisticsLoading(true);
    try {
      const leagueStatistics = await getJson<ScoringAudit>(
        `/api/v1/sleeper/leagues/${leagueId}/statistics?season=${season}`
      );
      setStatistics(leagueStatistics);
      setStatisticsBySeason((current) => ({
        ...current,
        [season]: leagueStatistics,
      }));
    } catch (reason) {
      setSelectedStatisticsSeason(statistics?.season ?? defaultStatisticsSeason);
      setStatisticsError(
        reason instanceof Error ? reason.message : "Unable to load that season."
      );
    } finally {
      setStatisticsLoading(false);
    }
  }
  return (
    <div className="player-group">
      <h3>
        {title}
        <span>{playerIds.length}</span>
      </h3>
      {playerIds.length ? (
        <div className="player-list" ref={animationParent}>
          {playerIds.map((id, i) => {
            const player = catalog[id];
            const availability = player?.injury_status ?? player?.status;
            const expanded = selectedId === id;
            const trendHistory = trendHistoryByPlayer[id];
            const statisticsSeasons = trendHistory
              ? Array.from(
                  new Set(
                    trendHistory.points
                      .filter((point) => point.week === null)
                      .map((point) => point.season)
                  )
                ).sort((left, right) => right - left)
              : [defaultStatisticsSeason];
            const highlighted = playerMatchesRosterSlot(player, filter, group);
            const ogDescription = player?.is_og
              ? `OG · Drafted here in ${player.og_drafted_season}${
                  player.og_pick_number
                    ? ` at pick ${player.og_pick_number}`
                    : ""
                } and has never left this franchise`
              : "";
            return (
              <div
                className={`player-card ${expanded ? "expanded" : ""} ${
                  filter ? (highlighted ? "slot-match" : "slot-muted") : ""
                }`}
                key={`${id}-${i}`}
              >
                <button
                  className="player"
                  onClick={() => inspect(id)}
                  aria-expanded={expanded}
                >
                  <span className={`position ${accent ? "active" : ""}`}>
                    {player?.avatar_url && (
                      <img
                        className="player-photo"
                        src={player.avatar_url}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <b>
                      {player?.position ??
                        (accent ? String(i + 1).padStart(2, "0") : "BN")}
                    </b>
                  </span>
                  <span>
                    <strong>
                      {player?.full_name ?? `Player ${id}`}
                      {player?.is_og && (
                        <span
                          className="og-badge"
                          data-tooltip={ogDescription}
                          aria-label={ogDescription}
                        >
                          OG
                        </span>
                      )}
                    </strong>
                    <small>
                      {[player?.nfl_team, availability]
                        .filter(Boolean)
                        .join(" · ") || `Sleeper ID · ${id}`}
                    </small>
                  </span>
                </button>
                {expanded &&
                  statistics &&
                  (() => {
                    const playerStatistics = statistics.players.find(
                      (item) => item.sleeper_player_id === id
                    );
                    return playerStatistics ? (
                      <PlayerStatisticsCard
                        player={playerStatistics}
                        season={statistics.season}
                        week={statistics.week}
                        tab={detailTab}
                        onTabChange={setDetailTab}
                        history={history}
                        availableSeasons={statisticsSeasons}
                        selectedSeason={selectedStatisticsSeason}
                        seasonLoading={statisticsLoading}
                        onSeasonChange={selectStatisticsSeason}
                        leagueId={leagueId}
                        trendHistory={trendHistory ?? null}
                      />
                    ) : (
                      <p className="loading-copy">
                        No statistics were found for this player.
                      </p>
                    );
                  })()}
                {expanded && statisticsError && (
                  <p className="loading-copy player-stat-error">
                    {statisticsError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-line">No players in this group.</p>
      )}
    </div>
  );
}
