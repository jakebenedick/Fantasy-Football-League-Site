/* eslint-disable @next/next/no-img-element -- Sleeper player avatars are CDN-sized. */
import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { PlayerStatisticsCard, type ScoringAudit } from "@/features/statistics";
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
}: PlayerGroupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [animationParent] = useAutoAnimate<HTMLDivElement>();
  const [history, setHistory] = useState<PlayerHistory | null>(null);
  const [statistics, setStatistics] = useState<ScoringAudit | null>(null);
  const [detailTab, setDetailTab] = useState<"statistics" | "transactions">(
    "statistics"
  );
  const [loading, setLoading] = useState(false);
  async function inspect(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setHistory(null);
      setStatistics(null);
      return;
    }
    setSelectedId(id);
    setLoading(true);
    setHistory(null);
    setStatistics(null);
    setDetailTab("statistics");
    try {
      const season = Math.max(1999, leagueSeason - 1);
      const [playerHistory, leagueStatistics] = await Promise.all([
        getJson<PlayerHistory>(
          `/api/v1/sleeper/leagues/${leagueId}/player-history/${id}`
        ),
        getJson<ScoringAudit>(
          `/api/v1/sleeper/leagues/${leagueId}/statistics?season=${season}`
        ),
      ]);
      setHistory(playerHistory);
      setStatistics(leagueStatistics);
    } finally {
      setLoading(false);
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
                {expanded && loading && (
                  <p className="loading-copy">Tracing player history…</p>
                )}
                {expanded &&
                  history &&
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
                      />
                    ) : (
                      <p className="loading-copy">
                        No statistics were found for this player.
                      </p>
                    );
                  })()}
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
