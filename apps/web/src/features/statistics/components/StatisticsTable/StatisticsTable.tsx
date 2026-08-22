/* eslint-disable @next/next/no-img-element -- player avatars are CDN-sized */
import { Fragment } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { RATE_STAT_KEYS, formatMetric } from "../../utils";
import { PlayerStatisticsCard } from "../PlayerStatisticsCard";
import type { StatisticsRowLimit } from "../../types";
import type { StatisticsTableProps } from "./types";

export function StatisticsTable({
  players,
  totalPlayerCount,
  columns,
  display,
  sort,
  expandedPlayerId,
  detailTab,
  histories,
  season,
  week,
  rowLimit,
  onSortChange,
  onPlayerToggle,
  onDetailTabChange,
  onRowLimitChange,
}: StatisticsTableProps) {
  const [tableAnimationParent] = useAutoAnimate<HTMLTableSectionElement>();
  const arrow = (key: string) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

  return (
    <>
      <div className="scoring-table-wrap">
        <table className="scoring-table">
          <thead>
            <tr>
              <th className="rank-column">Rank</th>
              <th>
                <button onClick={() => onSortChange("player")}>
                  Player{arrow("player")}
                </button>
              </th>
              <th>
                <button onClick={() => onSortChange("outlook")}>
                  Dynasty ECR{arrow("outlook")}
                </button>
              </th>
              {columns.map((column) => (
                <th key={column.key}>
                  <button onClick={() => onSortChange(`stat:${column.key}`)}>
                    {column.label}
                    {display === "perGame" && !RATE_STAT_KEYS.has(column.key)
                      ? "/G"
                      : ""}
                    {arrow(`stat:${column.key}`)}
                  </button>
                </th>
              ))}
              <th>
                <button onClick={() => onSortChange("points")}>
                  {display === "perGame" ? "FPTS/G" : "Fantasy points"}
                  {arrow("points")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody ref={tableAnimationParent}>
            {players.map((player, index) => {
              const isOpen = expandedPlayerId === player.sleeper_player_id;
              return (
                <Fragment
                  key={`${player.roster_id}-${player.sleeper_player_id}`}
                >
                  <tr
                    className={player.matched ? "" : "unmatched"}
                    onClick={() => onPlayerToggle(player.sleeper_player_id)}
                  >
                    <td className="rank-column">
                      <strong>{index + 1}</strong>
                    </td>
                    <td>
                      <div className="leader-player">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt="" />
                        ) : (
                          <span>{player.position ?? "?"}</span>
                        )}
                        <div>
                          <strong>{player.player_name}</strong>
                          <small>
                            {player.position ?? "—"} · {player.manager_name}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="outlook-cell">
                      {player.value_outlook ? (
                        <>
                          <strong>#{Math.round(player.value_outlook.ecr)}</strong>
                          <small>
                            {player.value_outlook.position_rank
                              ? `${player.position ?? "POS"}${
                                  player.value_outlook.position_rank
                                }`
                              : "Consensus"}{" "}
                            · Tier {player.value_outlook.tier ?? "—"}
                          </small>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className="stat-value">
                        {formatMetric(
                          display === "perGame" &&
                            player.games > 0 &&
                            !RATE_STAT_KEYS.has(column.key)
                            ? (player.statistics[column.key] ?? 0) / player.games
                            : player.statistics[column.key] ?? 0,
                          column.format
                        )}
                      </td>
                    ))}
                    <td>
                      <strong className="leader-points">
                        {(display === "perGame" && player.games > 0
                          ? player.fantasy_points / player.games
                          : player.fantasy_points
                        ).toFixed(1)}
                      </strong>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="scoring-detail-row">
                      <td colSpan={columns.length + 4}>
                        <PlayerStatisticsCard
                          player={player}
                          season={season}
                          week={week}
                          tab={detailTab}
                          onTabChange={onDetailTabChange}
                          history={histories[player.sleeper_player_id] ?? null}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPlayerCount > 0 && (
        <div
          className="statistics-pagination"
          aria-label="Statistics result display controls"
        >
          <span>
            Showing <strong>1–{players.length}</strong> of{" "}
            <strong>{totalPlayerCount}</strong> players
          </span>
          <label>
            Rows shown
            <select
              value={rowLimit}
              onChange={(event) => {
                const value = event.target.value;
                onRowLimitChange(
                  value === "all"
                    ? "all"
                    : (Number(value) as Exclude<StatisticsRowLimit, "all">)
                );
              }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
      )}
    </>
  );
}
