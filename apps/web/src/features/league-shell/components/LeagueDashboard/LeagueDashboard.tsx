/* eslint-disable @next/next/no-img-element -- Sleeper league and team avatars are CDN-sized. */
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  LeagueHistoryView,
  LeagueOverview,
  colorFor,
} from "@/features/dashboard";
import {
  DynastyAssets,
  OpponentHistoryPanels,
  PlayerGroup,
} from "@/features/rosters";
import { StatisticsView } from "@/features/statistics";
import { useLeagueDashboardData, type LeagueDashboardView } from "../../hooks";
import type { LeagueDashboardProps } from "./types";

export function LeagueDashboard({
  context,
  loading,
  error,
  preloadedStatistics,
  refresh,
  changeLeague,
}: LeagueDashboardProps) {
  const [selectedRosterId, setSelectedRosterId] = useState(
    context.selected_roster?.roster_id ?? context.rosters[0]?.roster_id
  );
  const [rosterSlotFilter, setRosterSlotFilter] = useState<string | null>(null);
  const [view, setView] = useState<LeagueDashboardView>("overview");
  const roster =
    context.rosters.find((item) => item.roster_id === selectedRosterId) ??
    context.selected_roster;
  const isMyTeam = roster?.owner_id === context.selected_user.user_id;
  const {
    activity,
    activityLoading,
    leagueHistory,
    leagueHistoryLoading,
    teamHistory: history,
    teamHistoryLoading: historyLoading,
    reigningChampion,
    championActivity,
  } = useLeagueDashboardData({
    leagueId: context.league.league_id,
    selectedUserId: context.selected_user.user_id,
    rosterOwnerId: roster?.owner_id,
    isMyTeam,
    view,
  });
  const starters = new Set(roster?.starters ?? []);
  const taxi = new Set(roster?.taxi ?? []);
  const reserve = new Set(roster?.reserve ?? []);
  const bench = (roster?.players ?? []).filter(
    (p) => !starters.has(p) && !taxi.has(p) && !reserve.has(p)
  );
  const record = useMemo(
    () => ({
      wins: roster?.settings.wins ?? 0,
      losses: roster?.settings.losses ?? 0,
      ties: roster?.settings.ties ?? 0,
    }),
    [roster]
  );
  useEffect(() => setRosterSlotFilter(null), [selectedRosterId]);
  return (
    <section className="content dashboard">
      <div className="dashboard-head">
        <div>
          <button className="back" onClick={changeLeague}>
            ← All leagues
          </button>
          <span className="kicker">{context.league.season} season</span>
          <div className="league-title-row">
            {context.league.avatar_url ? (
              <img
                className="league-image"
                src={context.league.avatar_url}
                alt={`${context.league.name} league logo`}
              />
            ) : (
              <span
                className="league-image fallback"
                aria-label="League football icon"
              >
                <span aria-hidden="true">🏈</span>
              </span>
            )}
            <div>
              <h1>{context.league.name}</h1>
              <p className="league-summary">
                {activity
                  ? `Live standings and dynasty activity from
                       ${activity.seasons_scanned.sort()[0]} to the present.`
                  : "Preparing live standings and league activity…"}
              </p>
            </div>
          </div>
        </div>
        <button
          className="secondary refresh"
          onClick={refresh}
          disabled={loading}
        >
          <Icon name="refresh" />
          {loading ? "Refreshing…" : "Refresh data"}
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
      {reigningChampion && (
        <section
          className="champion-banner"
          aria-label={`${reigningChampion.season} league champion`}
        >
          <span className="champion-trophy" aria-hidden="true">
            🏆
          </span>
          <div className="champion-copy">
            <span>Reigning champion</span>
            <strong>{reigningChampion.team.manager_name}</strong>
            <small>
              {reigningChampion.team.team_name &&
              reigningChampion.team.team_name !==
                reigningChampion.team.manager_name
                ? `${reigningChampion.team.team_name} · `
                : ""}
              {reigningChampion.season} league champion
            </small>
          </div>
          {reigningChampion.team.avatar_url ? (
            <img
              className="champion-avatar"
              src={reigningChampion.team.avatar_url}
              alt={`${reigningChampion.team.manager_name} team logo`}
            />
          ) : (
            <span
              className="champion-avatar fallback"
              style={{ background: colorFor(reigningChampion.team.owner_id) }}
            >
              {reigningChampion.team.manager_name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="champion-mark" aria-hidden="true">
            CHAMPIONS
          </span>
        </section>
      )}
      <nav className="league-nav" aria-label="League views">
        <button
          className={view === "overview" ? "active" : ""}
          onClick={() => setView("overview")}
        >
          League dashboard
        </button>
        <button
          className={view === "teams" ? "active" : ""}
          onClick={() => setView("teams")}
        >
          Rosters
        </button>
        <button
          className={view === "scoring" ? "active" : ""}
          onClick={() => setView("scoring")}
        >
          Statistics
        </button>
      </nav>
      {view === "overview" ? (
        <>
          <LeagueOverview
            activity={championActivity}
            loading={activityLoading}
            rosters={context.rosters}
            championOwnerId={reigningChampion?.team.owner_id}
            onOpenRoster={(rosterId) => {
              setSelectedRosterId(rosterId);
              setView("teams");
            }}
          />
          <section className="dashboard-history-section">
            <LeagueHistoryView
              history={leagueHistory}
              loading={leagueHistoryLoading}
            />
          </section>
        </>
      ) : view === "scoring" ? (
        <StatisticsView
          league={context.league}
          initialAudit={preloadedStatistics}
        />
      ) : !roster ? (
        <div className="empty">
          <h2>No roster found</h2>
          <p>This league does not have any available rosters.</p>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <Stat
              label="Record"
              value={`${record.wins}–${record.losses}${
                record.ties ? `–${record.ties}` : ""
              }`}
            />
            <Stat
              label="League size"
              value={`${context.league.total_rosters} teams`}
            />
            <Stat label="Roster" value={`${roster.players.length} players`} />
            <Stat
              label="Last synced"
              value={new Date(context.source.retrieved_at).toLocaleTimeString(
                [],
                { hour: "numeric", minute: "2-digit" }
              )}
            />
          </div>
          <section className="team-browser">
            <div className="section-title">
              <div>
                <span className="eyebrow">League rosters</span>
                <h2>Teams</h2>
              </div>
              <span>{context.rosters.length} managers</span>
            </div>
            <div className="team-tabs">
              {context.rosters.map((team) => {
                const mine = team.owner_id === context.selected_user.user_id;
                const wins = team.settings.wins ?? 0;
                const losses = team.settings.losses ?? 0;
                return (
                  <button
                    key={team.roster_id}
                    className={`team-tab ${
                      team.roster_id === roster.roster_id ? "selected" : ""
                    }`}
                    onClick={() => setSelectedRosterId(team.roster_id)}
                  >
                    {team.owner_avatar_url ? (
                      <img
                        className="team-photo"
                        src={team.owner_avatar_url}
                        alt=""
                      />
                    ) : (
                      <span className="team-avatar">
                        {(team.owner_display_name ?? `T${team.roster_id}`)
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                    <span>
                      <strong>
                        {team.team_name ??
                          team.owner_display_name ??
                          `Team ${team.roster_id}`}
                        <ChampionTrophy
                          show={
                            team.owner_id === reigningChampion?.team.owner_id
                          }
                        />
                        {mine && <small className="you">You</small>}
                      </strong>
                      <small>
                        {wins}–{losses} · {team.players.length} players
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="dashboard-grid">
            <section
              className={`panel lineup ${
                rosterSlotFilter ? "roster-filtering" : ""
              }`}
            >
              <div className="panel-head">
                <div>
                  <span className="eyebrow">
                    {isMyTeam ? "Your team" : "League opponent"}
                  </span>
                  <h2>
                    {roster.owner_display_name ?? `Team ${roster.roster_id}`}
                    <ChampionTrophy
                      show={roster.owner_id === reigningChampion?.team.owner_id}
                    />
                    &apos;s roster
                  </h2>
                </div>
                <span className="data-note">
                  {rosterSlotFilter
                    ? `Highlighting ${rosterSlotFilter}`
                    : "Live Sleeper player data"}
                </span>
              </div>
              <PlayerGroup
                title="Starters"
                group="starters"
                playerIds={roster.starters}
                catalog={context.players}
                filter={rosterSlotFilter}
                accent
                leagueId={context.league.league_id}
                leagueSeason={Number(context.league.season)}
              />
              <PlayerGroup
                title="Bench"
                group="bench"
                playerIds={bench}
                catalog={context.players}
                filter={rosterSlotFilter}
                leagueId={context.league.league_id}
                leagueSeason={Number(context.league.season)}
              />
              {roster.taxi.length > 0 && (
                <PlayerGroup
                  title={`Taxi squad · ${roster.taxi.length}/${
                    context.league.taxi_slots || roster.taxi.length
                  }`}
                  group="taxi"
                  playerIds={roster.taxi}
                  catalog={context.players}
                  filter={rosterSlotFilter}
                  leagueId={context.league.league_id}
                  leagueSeason={Number(context.league.season)}
                />
              )}{" "}
              {roster.reserve.length > 0 && (
                <PlayerGroup
                  title="Injured reserve"
                  group="reserve"
                  playerIds={roster.reserve}
                  catalog={context.players}
                  filter={rosterSlotFilter}
                  leagueId={context.league.league_id}
                  leagueSeason={Number(context.league.season)}
                />
              )}
            </section>
            <aside className="side-stack">
              {isMyTeam && (
                <section className="panel recommendation">
                  <span className="eyebrow">Co-manager</span>
                  <h2>Lineup analysis</h2>
                  <div className="coming-icon">
                    <Icon name="ball" />
                  </div>
                  <h3>Recommendation engine is warming up</h3>
                  <p>
                    Your league and roster are connected. Player projections and
                    lineup recommendations are the next feature.
                  </p>
                  <span className="soon">Coming next</span>
                </section>
              )}{" "}
              {!isMyTeam && (
                <section className="panel opponent-card">
                  <span className="eyebrow">Team overview</span>
                  <h2>
                    {roster.team_name ??
                      roster.owner_display_name ??
                      `Team ${roster.roster_id}`}
                    <ChampionTrophy
                      show={roster.owner_id === reigningChampion?.team.owner_id}
                    />
                  </h2>
                  <div className="opponent-record">
                    <strong>
                      {record.wins}–{record.losses}
                    </strong>
                    <span>Season record</span>
                  </div>
                  <p>
                    Browse this manager&apos;s starters, bench, history, and
                    draft capital.
                  </p>
                </section>
              )}
              <section className="panel settings">
                <span className="eyebrow">League format</span>
                <h2>Roster slots</h2>
                <div className="chips roster-slot-chips">
                  {context.league.roster_positions.map((slot, i) => (
                    <button
                      type="button"
                      key={`${slot}-${i}`}
                      aria-pressed={rosterSlotFilter === slot}
                      onClick={() =>
                        setRosterSlotFilter((current) =>
                          current === slot ? null : slot
                        )
                      }
                      className={`${slot === "BN" ? "muted-chip" : ""} ${
                        rosterSlotFilter === slot ? "active" : ""
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                  {Array.from({ length: context.league.taxi_slots }, (_, i) => (
                    <button
                      type="button"
                      className={`taxi-chip ${
                        rosterSlotFilter === "TAXI" ? "active" : ""
                      }`}
                      aria-pressed={rosterSlotFilter === "TAXI"}
                      onClick={() =>
                        setRosterSlotFilter((current) =>
                          current === "TAXI" ? null : "TAXI"
                        )
                      }
                      key={`taxi-${i}`}
                    >
                      TAXI
                    </button>
                  ))}
                </div>
                <p className="format-note">
                  {rosterSlotFilter
                    ? `Players eligible for ${rosterSlotFilter} are highlighted. Click again to clear.`
                    : "Select a slot to highlight eligible players. Taxi squad players are tracked separately from the active bench."}
                </p>
              </section>
            </aside>
          </div>
          <div className="context-grid">
            <DynastyAssets
              picks={roster.draft_picks}
              leagueId={context.league.league_id}
              catalog={context.players}
              rosters={context.rosters}
              championOwnerId={reigningChampion?.team.owner_id}
            />
            {!isMyTeam && (
              <OpponentHistoryPanels
                history={history}
                loading={historyLoading}
                catalog={context.players}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ChampionTrophy({ show }: { show: boolean }) {
  return show ? (
    <span
      className="champion-trophy-mini"
      title="Reigning league champion"
      aria-label="Reigning league champion"
    >
      🏆
    </span>
  ) : null;
}
