import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPlayerTrendHistory } from "../../services";
import { STAT_LABELS, formatMetric } from "../../utils";
import type {
  PlayerPerformanceChartProps,
  PlayerTrendHistory,
} from "./types";

type Scope = "weekly" | "season";

export function PlayerPerformanceChart({
  leagueId,
  playerId,
  playerName,
  season,
  availableSeasons,
  requestedMetric,
  requestToken,
  embedded = false,
  onClose,
  initialHistory,
}: PlayerPerformanceChartProps) {
  const [animationParent] = useAutoAnimate<HTMLElement>();
  const chartContainer = useRef<HTMLElement | null>(null);
  const setChartContainer = useCallback(
    (node: HTMLElement | null) => {
      chartContainer.current = node;
      animationParent(node);
    },
    [animationParent]
  );
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("weekly");
  const [metric, setMetric] = useState("fantasy_points");
  const [history, setHistory] = useState<PlayerTrendHistory | null>(initialHistory ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialHistory) setHistory(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    if (!requestedMetric || requestToken === undefined) return;
    setMetric(requestedMetric);
    setOpen(true);
    window.setTimeout(() => {
      chartContainer.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 120);
  }, [requestedMetric, requestToken]);

  useEffect(() => {
    if (!open || history) return;
    let active = true;
    setLoading(true);
    setError("");
    const endSeason = Math.max(season, ...availableSeasons);
    getPlayerTrendHistory(leagueId, playerId, endSeason)
      .then((result) => {
        if (!active) return;
        setHistory(result);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    availableSeasons,
    leagueId,
    open,
    playerId,
    history,
    season,
  ]);

  const points = useMemo(() => (history?.points ?? [])
    .filter((point) => scope === "season" ? point.week === null : point.season === season && point.week !== null)
    .sort((left, right) => scope === "season" ? left.season - right.season : (left.week ?? 0) - (right.week ?? 0)),
    [history, scope, season]
  );
  const metricOptions = useMemo(() => {
    const keys = new Set<string>();
    points.forEach((point) =>
      Object.entries(point.statistics).forEach(([key, value]) => {
        if (value !== 0 && STAT_LABELS[key]) keys.add(key);
      })
    );
    return ["fantasy_points", ...Array.from(keys).sort((left, right) =>
      STAT_LABELS[left].localeCompare(STAT_LABELS[right])
    )];
  }, [points]);
  const chartData = points.map((point) => ({
    label: scope === "season" ? String(point.season) : `W${point.week}`,
    value:
      metric === "fantasy_points"
        ? point.fantasy_points
        : point.statistics[metric] ?? 0,
  }));
  const metricLabel =
    metric === "fantasy_points" ? "Fantasy points" : STAT_LABELS[metric];

  return (
    <section className={`player-performance ${embedded ? "embedded" : ""}`} ref={setChartContainer}>
      {embedded ? (
        <div className="player-performance-embedded-head">
          <span><strong>{metricLabel} trends</strong><small>Weekly and year-over-year production</small></span>
          <button type="button" onClick={onClose} aria-label="Close performance chart">×</button>
        </div>
      ) : (
        <button className="player-performance-summary" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          <span><strong>Performance trends</strong><small>Explore weekly and year-over-year production</small></span>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      )}
      {(open || embedded) && (
        <div className="player-performance-body">
          <div className="player-performance-controls">
            <div className="performance-scope" aria-label="Chart range">
              <button
                className={scope === "weekly" ? "active" : ""}
                onClick={() => setScope("weekly")}
                type="button"
              >
                Week by week
              </button>
              <button
                className={scope === "season" ? "active" : ""}
                onClick={() => setScope("season")}
                type="button"
              >
                Season trends
              </button>
            </div>
            <label>
              Stat
              <select
                value={metricOptions.includes(metric) ? metric : "fantasy_points"}
                onChange={(event) => setMetric(event.target.value)}
              >
                {metricOptions.map((key) => (
                  <option value={key} key={key}>
                    {key === "fantasy_points" ? "Fantasy points" : STAT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <div className="performance-chart-state">Loading chart data…</div>
          ) : error ? (
            <div className="performance-chart-state error">{error}</div>
          ) : chartData.length ? (
            <>
              <div className="performance-chart-heading">
                <strong>{metricLabel}</strong>
                <span>
                  {scope === "weekly" ? `${season} regular season` : "By season"}
                </span>
              </div>
              <div
                className="performance-chart"
                role="img"
                aria-label={`${playerName} ${metricLabel} ${scope} chart`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [
                        formatMetric(Number(value ?? 0)),
                        metricLabel,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={metricLabel}
                      stroke="var(--green)"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="performance-chart-state">
              No production was recorded for this range.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
