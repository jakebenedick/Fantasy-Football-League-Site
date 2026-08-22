import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerHistory } from "@/features/transactions";
import { getJson } from "@/services";
import type {
  MetricColumn,
  RosterStatus,
  ScoringAudit,
  StatisticsDetailTab,
  StatisticsDisplay,
  StatisticsRowLimit,
  StatisticsSort,
} from "../../types";
import { RATE_STAT_KEYS, filterPlayers } from "../../utils";
import { MetricCustomizer } from "../MetricCustomizer";
import { StatisticsControls } from "../StatisticsControls";
import { StatisticsFilters } from "../StatisticsFilters";
import { StatisticsTable } from "../StatisticsTable";
import type { StatisticsViewProps } from "./types";

export function StatisticsView({
  league,
  initialAudit,
}: StatisticsViewProps) {
  const defaultSeason = Math.max(1999, Number(league.season) - 1);
  const usableInitialAudit =
    initialAudit?.league_id === league.league_id &&
    initialAudit.season === defaultSeason &&
    initialAudit.week === null
      ? initialAudit
      : null;
  const [season, setSeason] = useState(defaultSeason);
  const [week, setWeek] = useState<number | null>(null);
  const [audit, setAudit] = useState<ScoringAudit | null>(usableInitialAudit);
  const [loading, setLoading] = useState(!usableInitialAudit);
  const loadedRequestKey = useRef<string | null>(
    usableInitialAudit ? `${league.league_id}:${defaultSeason}:all` : null
  );
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailTab, setDetailTab] =
    useState<StatisticsDetailTab>("statistics");
  const [histories, setHistories] = useState<Record<string, PlayerHistory>>({});
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [rosterStatus, setRosterStatus] = useState<RosterStatus>("all");
  const [statDisplay, setStatDisplay] =
    useState<StatisticsDisplay>("total");
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);
  const [sort, setSort] = useState<StatisticsSort>({
    key: "points",
    direction: "desc",
  });
  const [rowLimit, setRowLimit] = useState<StatisticsRowLimit>(50);

  useEffect(() => {
    const requestKey = `${league.league_id}:${season}:${week ?? "all"}`;
    if (loadedRequestKey.current === requestKey) {
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    const weekQuery = week ? `&week=${week}` : "";
    getJson<ScoringAudit>(
      `/api/v1/sleeper/leagues/${league.league_id}/statistics?season=${season}${weekQuery}`
    )
      .then((result) => {
        if (active) {
          setAudit(result);
          loadedRequestKey.current = requestKey;
        }
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
  }, [league.league_id, season, week]);

  const players = useMemo(() => {
    if (!audit) return [];
    const result = filterPlayers(audit.players, {
      search,
      position,
      rosterStatus,
    });
    const direction = sort.direction === "asc" ? 1 : -1;
    const valueForDisplay = (value: number, games: number, key?: string) =>
      statDisplay === "perGame" && !RATE_STAT_KEYS.has(key ?? "")
        ? games > 0
          ? value / games
          : 0
        : value;
    return result.sort((a, b) => {
      if (sort.key === "points")
        return (
          (valueForDisplay(a.fantasy_points, a.games) -
            valueForDisplay(b.fantasy_points, b.games)) *
          direction
        );
      if (sort.key.startsWith("stat:")) {
        const key = sort.key.slice(5);
        return (
          (valueForDisplay(a.statistics[key] ?? 0, a.games, key) -
            valueForDisplay(b.statistics[key] ?? 0, b.games, key)) *
          direction
        );
      }
      if (sort.key === "outlook") {
        const left = a.value_outlook?.ecr ?? Number.POSITIVE_INFINITY;
        const right = b.value_outlook?.ecr ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(left)) return 1;
        if (!Number.isFinite(right)) return -1;
        return (left - right) * direction;
      }
      const left = sort.key === "manager" ? a.manager_name : a.player_name;
      const right = sort.key === "manager" ? b.manager_name : b.player_name;
      return left.localeCompare(right) * direction;
    });
  }, [audit, position, rosterStatus, search, sort, statDisplay]);

  useEffect(() => {
    setRowLimit(50);
    setExpanded(null);
  }, [position, rosterStatus, search, season, sort, statDisplay, week]);

  const visiblePlayers = useMemo(
    () => (rowLimit === "all" ? players : players.slice(0, rowLimit)),
    [players, rowLimit]
  );

  function changeSort(key: string) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction: key === "player" || key === "outlook" ? "asc" : "desc",
          }
    );
  }

  const metricCategory = (key: string) => {
    if (
      ["pass_att", "rush_att", "targets", "touches", "opportunities"].includes(
        key
      )
    )
      return "Opportunity";
    if (
      [
        "pass_yd",
        "pass_td",
        "pass_int",
        "rush_yd",
        "rush_td",
        "rec",
        "rec_yd",
        "rec_td",
        "total_td",
        "yac",
        "sack",
        "int",
        "ff",
        "fum_rec",
        "def_td",
      ].includes(key)
    )
      return "Production";
    return "Core";
  };
  const defaultStatisticColumns = useMemo<MetricColumn[]>(() => {
    const byPosition: Record<string, { key: string; label: string }[]> = {
      QB: [
        { key: "pass_yd", label: "Pass yds" },
        { key: "pass_td", label: "Pass TD" },
        { key: "pass_int", label: "INT" },
        { key: "rush_yd", label: "Rush yds" },
      ],
      RB: [
        { key: "rush_att", label: "Carries" },
        { key: "rush_yd", label: "Rush yds" },
        { key: "rec", label: "Rec" },
        { key: "rec_yd", label: "Rec yds" },
        { key: "total_td", label: "TD" },
      ],
      WR: [
        { key: "rec", label: "Rec" },
        { key: "rec_yd", label: "Rec yds" },
        { key: "rec_td", label: "Rec TD" },
        { key: "total_td", label: "Total TD" },
      ],
      TE: [
        { key: "rec", label: "Rec" },
        { key: "rec_yd", label: "Rec yds" },
        { key: "rec_td", label: "Rec TD" },
        { key: "total_td", label: "Total TD" },
      ],
      DEF: [
        { key: "sack", label: "Sacks" },
        { key: "int", label: "INT" },
        { key: "ff", label: "FF" },
        { key: "fum_rec", label: "Fum rec" },
        { key: "def_td", label: "Def TD" },
      ],
    };
    return (
      byPosition[position] ?? [
        { key: "pass_yd", label: "Pass yds" },
        { key: "rush_yd", label: "Rush yds" },
        { key: "rec", label: "Rec" },
        { key: "rec_yd", label: "Rec yds" },
        { key: "total_td", label: "TD" },
      ]
    ).map((metric) => ({
      ...metric,
      category: metricCategory(metric.key),
      format: "number",
    }));
  }, [position]);
  const availableMetricColumns = useMemo(() => {
    const catalog = (audit?.statistic_catalog ?? [])
      .filter(
        (metric) =>
          position === "ALL" ||
          metric.positions.length === 0 ||
          metric.positions.includes(position)
      )
      .map((metric) => ({
        key: metric.key,
        label: metric.label,
        category: metric.category,
        format: metric.format,
      }));
    return [...defaultStatisticColumns, ...catalog].filter(
      (metric, index, all) =>
        all.findIndex((candidate) => candidate.key === metric.key) === index
    );
  }, [audit?.statistic_catalog, defaultStatisticColumns, position]);
  const statisticColumns = useMemo(
    () =>
      selectedMetricKeys.length
        ? availableMetricColumns.filter((metric) =>
            selectedMetricKeys.includes(metric.key)
          )
        : defaultStatisticColumns,
    [availableMetricColumns, defaultStatisticColumns, selectedMetricKeys]
  );

  useEffect(() => {
    if (!expanded || histories[expanded]) return;
    getJson<PlayerHistory>(
      `/api/v1/sleeper/leagues/${league.league_id}/player-history/${expanded}`
    ).then((history) =>
      setHistories((current) => ({ ...current, [expanded]: history }))
    );
  }, [expanded, histories, league.league_id]);
  return (
    <section className="scoring-audit statistics-view">
      <StatisticsControls
        leagueSeason={league.season}
        season={season}
        week={week}
        display={statDisplay}
        onSeasonChange={setSeason}
        onWeekChange={setWeek}
        onDisplayChange={setStatDisplay}
      />
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="scoring-loading">Loading public player statistics…</div>
      ) : audit ? (
        <>
          <StatisticsFilters
            search={search}
            position={position}
            rosterStatus={rosterStatus}
            eligiblePositions={audit.eligible_positions}
            playerCount={players.length}
            onSearchChange={setSearch}
            onPositionChange={setPosition}
            onRosterStatusChange={setRosterStatus}
          />
          <MetricCustomizer
            availableMetrics={availableMetricColumns}
            defaultMetrics={defaultStatisticColumns}
            selectedMetricKeys={selectedMetricKeys}
            onSelectedMetricKeysChange={setSelectedMetricKeys}
          />
          <p className="outlook-source-note">
            <strong>Value &amp; outlook:</strong>{" "}
            {audit.players.some((player) => player.value_outlook)
              ? "Current FantasyPros dynasty consensus via DynastyProcess. ECR and expert ranges are source data; tiers are Fourth Down derived."
              : audit.outlook_status}
          </p>
          {audit.unsupported_scoring_keys.length > 0 && (
            <div className="scoring-warning">
              <strong>Not calculated yet:</strong>{" "}
              {audit.unsupported_scoring_keys.join(", ")}. These rules are
              excluded from totals until we add and verify their nflverse
              equivalents.
            </div>
          )}
          <StatisticsTable
            players={visiblePlayers}
            totalPlayerCount={players.length}
            columns={statisticColumns}
            display={statDisplay}
            sort={sort}
            expandedPlayerId={expanded}
            detailTab={detailTab}
            histories={histories}
            season={season}
            week={week}
            rowLimit={rowLimit}
            onSortChange={changeSort}
            onPlayerToggle={(playerId) => {
              setExpanded(expanded === playerId ? null : playerId);
              setDetailTab("statistics");
            }}
            onDetailTabChange={setDetailTab}
            onRowLimitChange={(limit) => {
              setExpanded(null);
              setRowLimit(limit);
            }}
          />
          <p className="scoring-footnote">
            Ownership reflects today&apos;s Sleeper rosters; statistics reflect
            the selected historical period. Player cards keep production and
            league transaction history together without storing either source
            persistently.
          </p>
        </>
      ) : null}
    </section>
  );
}
