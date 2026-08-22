/* eslint-disable @next/next/no-img-element -- Sleeper team avatars are CDN-sized. */
import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Roster } from "@/features/rosters";
import type { LeagueActivity, LeagueActivityTrade } from "@/features/transactions";
import { teamLabel } from "../../utils";
import type { LeagueOverviewProps } from "./types";

export function LeagueOverview({
  activity,
  loading,
  rosters,
  onOpenRoster,
  championOwnerId,
}: LeagueOverviewProps) {
  const [sort, setSort] = useState<{
    key: "manager" | "trades" | "transactions";
    direction: "asc" | "desc";
  }>({ key: "transactions", direction: "desc" });
  if (loading)
    return (
      <div className="empty">
        <span className="spinner dark" />
        <h2>Building league leaderboard…</h2>
        <p>Reviewing completed transactions across league seasons.</p>
      </div>
    );
  if (!activity)
    return (
      <div className="empty">
        <h2>League activity unavailable</h2>
        <p>Refresh the data to try again.</p>
      </div>
    );
  const byTrades = [...activity.teams].sort(
    (a, b) => b.trades - a.trades || b.transactions - a.transactions
  );
  const byTransactions = [...activity.teams].sort(
    (a, b) => b.transactions - a.transactions || b.trades - a.trades
  );
  const leastTrades = [...activity.teams].sort(
    (a, b) => a.trades - b.trades || a.transactions - b.transactions
  );
  const leastTransactions = [...activity.teams].sort(
    (a, b) => a.transactions - b.transactions || a.trades - b.trades
  );
  const byAllTimePoints = activity.teams
    .filter((team) => team.all_time_points > 0)
    .sort((a, b) => b.all_time_points - a.all_time_points);
  const byHighestWeek = activity.teams
    .filter((team) => team.highest_weekly_score !== null)
    .sort(
      (a, b) => Number(b.highest_weekly_score) - Number(a.highest_weekly_score)
    );
  const byLowestWeek = activity.teams
    .filter((team) => team.lowest_weekly_score !== null)
    .sort(
      (a, b) => Number(a.lowest_weekly_score) - Number(b.lowest_weekly_score)
    );
  const sortedTeams = [...activity.teams].sort((a, b) => {
    const comparison =
      sort.key === "manager"
        ? a.manager_name.localeCompare(b.manager_name)
        : a[sort.key] - b[sort.key];
    return sort.direction === "asc" ? comparison : -comparison;
  });
  const changeSort = (key: "manager" | "trades" | "transactions") =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  const arrow = (key: "manager" | "trades" | "transactions") =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const normalizeManagerName = (value: string | null | undefined) =>
    (value ?? "")
      .replace(/\s*🏆\s*$/u, "")
      .trim()
      .toLocaleLowerCase();
  const rosterForTeam = (team: LeagueActivity["teams"][number]) => {
    const ownerMatch = rosters.find(
      (roster) => roster.owner_id === team.owner_id
    );
    if (ownerMatch) return ownerMatch;

    const managerName = normalizeManagerName(team.manager_name);
    const nameMatches = rosters.filter((roster) =>
      [roster.owner_display_name, roster.team_name].some(
        (name) => normalizeManagerName(name) === managerName
      )
    );
    return nameMatches.length === 1 ? nameMatches[0] : undefined;
  };
  const HotNotCard = ({
    label,
    hotTeam,
    coldTeam,
    hotValue,
    coldValue,
    hotDetail,
    coldDetail,
  }: {
    label: string;
    hotTeam: LeagueActivity["teams"][number] | undefined;
    coldTeam: LeagueActivity["teams"][number] | undefined;
    hotValue: string;
    coldValue: string;
    hotDetail?: string;
    coldDetail?: string;
  }) => {
    const Side = ({
      team,
      value,
      detail,
      temperature,
    }: {
      team: LeagueActivity["teams"][number] | undefined;
      value: string;
      detail?: string;
      temperature: "hot" | "cold";
    }) => {
      if (!team) return <div className={`hot-not-side ${temperature}`} />;
      const linkedRoster = rosterForTeam(team);
      return (
        <button
          type="button"
          className={`hot-not-side ${temperature}`}
          disabled={!linkedRoster}
          onClick={() => linkedRoster && onOpenRoster(linkedRoster.roster_id)}
          aria-label={`View ${team.manager_name}'s roster`}
        >
          <span className="temperature-label">
            {temperature === "hot" ? "🔥 Hot" : "❄️ Not"}
          </span>
          <div className="hot-not-manager">
            {team.avatar_url ? (
              <img src={team.avatar_url} alt="" />
            ) : (
              <i>{team.manager_name.slice(0, 2).toUpperCase()}</i>
            )}
            <span>
              <strong>{team.manager_name}</strong>
              <small>{detail}</small>
            </span>
          </div>
          <b>{value}</b>
        </button>
      );
    };
    return (
      <article className="hot-not-card">
        <header>
          <span>{label}</span>
          <small>Most vs. least</small>
        </header>
        <div className="hot-not-comparison">
          <Side
            team={hotTeam}
            value={hotValue}
            detail={hotDetail}
            temperature="hot"
          />
          <Side
            team={coldTeam}
            value={coldValue}
            detail={coldDetail}
            temperature="cold"
          />
        </div>
      </article>
    );
  };
  return (
    <section className="activity-dashboard">
      <div className="hot-not-grid">
        <HotNotCard
          label="Trades"
          hotTeam={byTrades[0]}
          coldTeam={leastTrades[0]}
          hotValue={`${byTrades[0]?.trades ?? 0}`}
          coldValue={`${leastTrades[0]?.trades ?? 0}`}
          hotDetail="completed trades"
          coldDetail="completed trades"
        />
        <HotNotCard
          label="Transactions"
          hotTeam={byTransactions[0]}
          coldTeam={leastTransactions[0]}
          hotValue={`${byTransactions[0]?.transactions ?? 0}`}
          coldValue={`${leastTransactions[0]?.transactions ?? 0}`}
          hotDetail="completed moves"
          coldDetail="completed moves"
        />
        <HotNotCard
          label="All-time points"
          hotTeam={byAllTimePoints[0]}
          coldTeam={byAllTimePoints.at(-1)}
          hotValue={(byAllTimePoints[0]?.all_time_points ?? 0).toLocaleString()}
          coldValue={(
            byAllTimePoints.at(-1)?.all_time_points ?? 0
          ).toLocaleString()}
          hotDetail="dynasty total"
          coldDetail="dynasty total"
        />
        <HotNotCard
          label="Weekly score"
          hotTeam={byHighestWeek[0]}
          coldTeam={byLowestWeek[0]}
          hotValue={byHighestWeek[0]?.highest_weekly_score?.toFixed(2) ?? "—"}
          coldValue={byLowestWeek[0]?.lowest_weekly_score?.toFixed(2) ?? "—"}
          hotDetail={
            byHighestWeek[0]
              ? `${byHighestWeek[0].highest_weekly_season} · Week ${byHighestWeek[0].highest_weekly_week}`
              : undefined
          }
          coldDetail={
            byLowestWeek[0]
              ? `${byLowestWeek[0].lowest_weekly_season} · Week ${byLowestWeek[0].lowest_weekly_week}`
              : undefined
          }
        />
      </div>
      <div className="activity-grid">
        <section className="panel">
          <span className="eyebrow">All managers</span>
          <h2>Activity leaderboard</h2>
          <div className="activity-table">
            <div className="activity-row heading">
              <button
                className={sort.key === "manager" ? "active" : ""}
                onClick={() => changeSort("manager")}
              >
                Manager{arrow("manager")}
              </button>
              <button
                className={sort.key === "trades" ? "active" : ""}
                onClick={() => changeSort("trades")}
              >
                Trades{arrow("trades")}
              </button>
              <button
                className={sort.key === "transactions" ? "active" : ""}
                onClick={() => changeSort("transactions")}
              >
                Transactions{arrow("transactions")}
              </button>
            </div>
            {sortedTeams.map((team, index) => (
              <div className="activity-row" key={team.owner_id}>
                <b>{index + 1}</b>
                {team.avatar_url ? (
                  <img src={team.avatar_url} alt="" />
                ) : (
                  <i>{team.manager_name.slice(0, 2).toUpperCase()}</i>
                )}
                <button
                  type="button"
                  className="manager-roster-link"
                  disabled={!rosterForTeam(team)}
                  onClick={() => {
                    const roster = rosterForTeam(team);
                    if (roster) onOpenRoster(roster.roster_id);
                  }}
                >
                  {team.manager_name}
                </button>
                <span>{team.trades}</span>
                <span>{team.transactions}</span>
              </div>
            ))}
          </div>
        </section>
        <LiveStandings
          rosters={rosters}
          onOpenRoster={onOpenRoster}
          championOwnerId={championOwnerId}
        />
      </div>
      <section className="panel trade-partners-wide">
        <span className="eyebrow">Trade partners</span>
        <h2>Most frequent trade partners</h2>
        <TradePairList pairs={activity.trade_pairs} />
      </section>
    </section>
  );
}

function LiveStandings({
  rosters,
  onOpenRoster,
  championOwnerId,
}: {
  rosters: Roster[];
  onOpenRoster: (rosterId: number) => void;
  championOwnerId?: string | null;
}) {
  const standings = [...rosters].sort(
    (a, b) =>
      Number(b.settings.wins ?? 0) - Number(a.settings.wins ?? 0) ||
      Number(b.settings.ties ?? 0) - Number(a.settings.ties ?? 0) ||
      Number(b.settings.fpts ?? 0) +
        Number(b.settings.fpts_decimal ?? 0) / 100 -
        (Number(a.settings.fpts ?? 0) +
          Number(a.settings.fpts_decimal ?? 0) / 100)
  );
  const seasonHasStarted = standings.some((team) => {
    const settings = team.settings;
    return (
      Number(settings.wins ?? 0) > 0 ||
      Number(settings.losses ?? 0) > 0 ||
      Number(settings.ties ?? 0) > 0 ||
      Number(settings.fpts ?? 0) > 0 ||
      Number(settings.fpts_decimal ?? 0) > 0
    );
  });
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <section className="panel live-standings">
      <span className="eyebrow">Current season</span>
      <h2>Live standings</h2>
      <div className="standings-list">
        {standings.map((team, index) => {
          const wins = Number(team.settings.wins ?? 0);
          const losses = Number(team.settings.losses ?? 0);
          const ties = Number(team.settings.ties ?? 0);
          const points =
            Number(team.settings.fpts ?? 0) +
            Number(team.settings.fpts_decimal ?? 0) / 100;
          return (
            <button
              type="button"
              className={`standing-roster-link ${
                seasonHasStarted && index < 3
                  ? `standing-podium standing-podium-${index + 1}`
                  : ""
              }`}
              key={team.roster_id}
              onClick={() => onOpenRoster(team.roster_id)}
              aria-label={`View ${teamLabel(team, championOwnerId)} roster`}
            >
              <b>{seasonHasStarted ? medals[index] ?? index + 1 : "T1"}</b>
              {team.owner_avatar_url ? (
                <img src={team.owner_avatar_url} alt="" />
              ) : (
                <i>
                  {(team.owner_display_name ?? `T${team.roster_id}`)
                    .slice(0, 2)
                    .toUpperCase()}
                </i>
              )}
              <span>
                <strong>{teamLabel(team, championOwnerId)}</strong>
                <small>
                  {wins}–{losses}
                  {ties ? `–${ties}` : ""} · {points.toFixed(2)} PF
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function TradePairList({ pairs }: { pairs: LeagueActivity["trade_pairs"] }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [animationParent] = useAutoAnimate<HTMLDivElement>();
  if (!pairs.length)
    return <p className="loading-copy">No completed trades were found.</p>;
  const visible = expanded ? pairs : pairs.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="pair-list" ref={animationParent}>
      {visible.map((pair, index) => {
        const key = pair.owner_ids.join("-");
        const open = selected === key;
        return (
          <article
            className={`${index < 3 ? `podium podium-${index + 1}` : ""} ${
              open ? "pair-open" : ""
            }`}
            key={key}
          >
            <button
              className="pair-summary"
              onClick={() =>
                setSelected((current) => (current === key ? null : key))
              }
              aria-expanded={open}
            >
              <b
                aria-label={
                  index < 3 ? `${index + 1} place` : `Rank ${index + 1}`
                }
              >
                {medals[index] ?? index + 1}
              </b>
              <span>
                <strong>{pair.manager_names.join(" ↔ ")}</strong>
                <small>
                  {pair.trades} completed trade{pair.trades === 1 ? "" : "s"}
                </small>
              </span>
              <i>{open ? "−" : "+"}</i>
            </button>
            {open && (
              <div className="pair-history">
                <span className="pair-history-title">Trade history</span>
                {pair.trade_history.map((trade, tradeIndex) => (
                  <PairTradeDetail
                    trade={trade}
                    index={tradeIndex}
                    key={trade.transaction_id}
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}
      {pairs.length > 3 && (
        <button
          className="pair-expand"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show top 3" : "View all matchups"}
          <span>{expanded ? "↑" : "↓"}</span>
        </button>
      )}
    </div>
  );
}
function PairTradeDetail({
  trade,
  index,
}: {
  trade: LeagueActivityTrade;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const [animationParent] = useAutoAnimate<HTMLDivElement>();
  return (
    <div className="pair-trade" ref={animationParent}>
      <div className="pair-trade-head">
        <i>{index + 1}</i>
        <div>
          <strong>{trade.season} trade</strong>
          <small>{new Date(trade.created_at).toLocaleDateString()}</small>
        </div>
      </div>
      <button
        className="event-details-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide details" : "View all details"}
      </button>
      {open && (
        <div className="event-details">
          {trade.sides.map((side) => (
            <div className="pair-trade-side" key={side.manager_name}>
              <strong>{side.manager_name} received</strong>
              {side.assets_received.length ? (
                side.assets_received.map((asset, assetIndex) => (
                  <span key={`${asset}-${assetIndex}`}>{asset}</span>
                ))
              ) : (
                <span>No cataloged assets</span>
              )}
            </div>
          ))}
          <small>Transaction ID: {trade.transaction_id}</small>
        </div>
      )}
    </div>
  );
}
