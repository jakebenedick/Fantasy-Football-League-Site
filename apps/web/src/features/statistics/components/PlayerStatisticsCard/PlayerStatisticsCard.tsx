/* eslint-disable @next/next/no-img-element -- player avatars are CDN-sized */
import { Fragment, useState } from "react";
import { PlayerHistoryEvent } from "@/features/transactions";
import { PlayerPerformanceChart } from "../PlayerPerformanceChart";
import {
  RATE_STAT_KEYS,
  STAT_LABELS,
  formatMetric,
  formatStatistic,
} from "../../utils";
import type { PlayerStatisticsCardProps } from "./types";

export function PlayerStatisticsCard({
  player,
  season,
  week,
  tab,
  onTabChange,
  history,
  availableSeasons,
  selectedSeason = season,
  seasonLoading = false,
  onSeasonChange,
  leagueId,
  trendHistory,
}: PlayerStatisticsCardProps) {
  const [historyOrder, setHistoryOrder] = useState<"newest" | "oldest">(
    "newest"
  );
  const [requestedChartMetric, setRequestedChartMetric] = useState<string>();
  const [chartRequestToken, setChartRequestToken] = useState(0);
  const visibleStatistics = Object.entries(player.statistics)
    .filter(([key, value]) => value !== 0 && key in STAT_LABELS)
    .sort(([left], [right]) =>
      (STAT_LABELS[left] ?? left).localeCompare(STAT_LABELS[right] ?? right)
    );
  const scoringTotal = player.breakdown.reduce(
    (total, item) => total + item.points,
    0
  );

  function showMetricTrend(metric: string) {
    if (requestedChartMetric === metric) {
      setRequestedChartMetric(undefined);
      return;
    }
    setRequestedChartMetric(metric);
    setChartRequestToken((current) => current + 1);
  }
  return (
    <article className="player-stat-card">
      <header className="player-stat-hero">
        <div className="player-stat-portrait">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt="" />
          ) : (
            <span>{player.position ?? "NFL"}</span>
          )}
        </div>
        <div className="player-stat-identity">
          <span>{player.manager_name}</span>
          <h3>{player.player_name}</h3>
          {availableSeasons && onSeasonChange && (
            <label className="player-stat-season">
              <span>Season</span>
              <select
                aria-label={`Statistics season for ${player.player_name}`}
                value={selectedSeason}
                disabled={seasonLoading}
                onChange={(event) => onSeasonChange(Number(event.target.value))}
              >
                {availableSeasons.map((availableSeason) => (
                  <option value={availableSeason} key={availableSeason}>
                    {availableSeason}
                  </option>
                ))}
              </select>
              {seasonLoading && <small>Loading…</small>}
            </label>
          )}
          <p>
            {player.position ?? "NFL"} · {season}
            {week ? ` Week ${week}` : " regular season"}
          </p>
        </div>
        <div className="player-stat-highlights">
          <div>
            <span>Position rank</span>
            <strong>
              {player.position_rank
                ? `${player.position ?? "POS"}${player.position_rank}`
                : "—"}
            </strong>
          </div>
          <div>
            <span>Overall rank</span>
            <strong>
              {player.overall_rank ? `#${player.overall_rank}` : "—"}
            </strong>
          </div>
          <div>
            <span>Fantasy points</span>
            <strong>{player.fantasy_points.toFixed(1)}</strong>
          </div>
          <div>
            <span>Games</span>
            <strong>{player.games}</strong>
          </div>
          <div>
            <span>Points/game</span>
            <strong>
              {player.games
                ? (player.fantasy_points / player.games).toFixed(1)
                : "—"}
            </strong>
          </div>
          {player.value_outlook && (
            <div>
              <span>Dynasty outlook</span>
              <strong>#{Math.round(player.value_outlook.ecr)}</strong>
            </div>
          )}
        </div>
      </header>
      <nav
        className="player-detail-tabs"
        aria-label={`${player.player_name} details`}
      >
        <button
          className={tab === "statistics" ? "active" : ""}
          onClick={() => onTabChange("statistics")}
        >
          Statistics
        </button>
        <button
          className={tab === "transactions" ? "active" : ""}
          onClick={() => onTabChange("transactions")}
        >
          Transactions
        </button>
      </nav>
      {tab === "statistics" ? (
        <>
          {player.value_outlook && (
            <section className="value-outlook-card">
              <div>
                <span className="eyebrow">Value &amp; outlook</span>
                <h4>{player.value_outlook.ranking_format} consensus</h4>
                <p>
                  Source: {player.value_outlook.source}
                  {player.value_outlook.effective_at
                    ? ` · Updated ${player.value_outlook.effective_at}`
                    : ""}
                </p>
              </div>
              <dl>
                <div>
                  <dt>ECR</dt>
                  <dd>#{Math.round(player.value_outlook.ecr)}</dd>
                </div>
                <div>
                  <dt>Position</dt>
                  <dd>
                    {player.value_outlook.position_rank
                      ? `${player.position ?? "POS"}${
                          player.value_outlook.position_rank
                        }`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Derived tier</dt>
                  <dd>{player.value_outlook.tier ?? "—"}</dd>
                </div>
                <div>
                  <dt>Expert range</dt>
                  <dd>
                    {player.value_outlook.best_rank &&
                    player.value_outlook.worst_rank
                      ? `#${Math.round(
                          player.value_outlook.best_rank
                        )}–#${Math.round(player.value_outlook.worst_rank)}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          <div className={`player-stat-content ${requestedChartMetric ? "chart-active" : ""}`}>
            <div className="player-stat-grid">
              {visibleStatistics.map(([key, value]) => (
                <Fragment key={key}>
                  <button
                    className={`player-stat-metric ${
                      requestedChartMetric === key ? "trend-selected" : ""
                    }`}
                    type="button"
                    onClick={() => showMetricTrend(key)}
                    aria-pressed={requestedChartMetric === key}
                    aria-label={`${requestedChartMetric === key ? "Hide" : "View"} ${STAT_LABELS[key]} trend`}
                  >
                    <span>{STAT_LABELS[key]}</span>
                    <strong>
                      {formatMetric(
                        value,
                        key.endsWith("_pct") ||
                          key.endsWith("_rate") ||
                          key.endsWith("_share")
                          ? "percent"
                          : RATE_STAT_KEYS.has(key)
                          ? "decimal"
                          : undefined
                      )}
                    </strong>
                    <small>{requestedChartMetric === key ? "Hide trend" : "View trend"}</small>
                  </button>
                  {requestedChartMetric === key && leagueId && availableSeasons && (
                    <PlayerPerformanceChart
                      leagueId={leagueId}
                      playerId={player.sleeper_player_id}
                      playerName={player.player_name}
                      season={season}
                      availableSeasons={availableSeasons}
                      requestedMetric={requestedChartMetric}
                      requestToken={chartRequestToken}
                      embedded
                      onClose={() => setRequestedChartMetric(undefined)}
                      initialHistory={trendHistory}
                    />
                  )}
                </Fragment>
              ))}
            </div>
            {!requestedChartMetric && <section className="fantasy-breakdown">
              <h4>League scoring breakdown</h4>
              {player.breakdown.map((item) => (
                <div className="scoring-line" key={item.scoring_key}>
                  <span>
                    {item.label}
                    <small>
                      {formatStatistic(item.statistic)} × {item.multiplier}
                    </small>
                  </span>
                  <strong>{item.points.toFixed(2)} pts</strong>
                </div>
              ))}
              <div className="scoring-total">
                <span>Total</span>
                <strong>{scoringTotal.toFixed(2)} pts</strong>
              </div>
            </section>}
          </div>
        </>
      ) : history ? (
        <div className="player-transaction-list">
          <div className="transaction-order">
            <span>Transaction order</span>
            <div className="history-order">
              <button
                className={historyOrder === "newest" ? "active" : ""}
                onClick={() => setHistoryOrder("newest")}
              >
                Newest
              </button>
              <button
                className={historyOrder === "oldest" ? "active" : ""}
                onClick={() => setHistoryOrder("oldest")}
              >
                Oldest
              </button>
            </div>
          </div>
          {history.events.length ? (
            (historyOrder === "oldest"
              ? history.events
              : [...history.events].reverse()
            ).map((event, index) => (
              <PlayerHistoryEvent
                event={event}
                index={index}
                key={`${event.event_type}-${event.occurred_at}-${index}`}
              />
            ))
          ) : (
            <p>No draft or transaction events were found.</p>
          )}
        </div>
      ) : (
        <p className="loading-copy">Loading transaction history…</p>
      )}
    </article>
  );
}
