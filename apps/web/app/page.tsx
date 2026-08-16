"use client";
/* eslint-disable @next/next/no-img-element -- Sleeper avatar thumbnails are already CDN-sized. */

import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";

type League = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  taxi_slots: number;
  avatar_url: string | null;
};
type User = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};
type DraftPick = {
  season: string;
  round: number;
  original_roster_id: number;
  original_owner_name: string | null;
  pick_number: number | null;
  acquired: boolean;
};
type Roster = {
  roster_id: number;
  owner_id: string | null;
  owner_display_name: string | null;
  team_name: string | null;
  owner_avatar_url: string | null;
  players: string[];
  starters: string[];
  taxi: string[];
  reserve: string[];
  settings: Record<string, number | null>;
  draft_picks: DraftPick[];
};
type Player = {
  player_id: string;
  full_name: string;
  nfl_team: string | null;
  position: string | null;
  eligible_positions: string[];
  status: string | null;
  injury_status: string | null;
  number: number | null;
  avatar_url: string | null;
  is_og: boolean;
  og_drafted_season: string | null;
  og_pick_number: number | null;
};
type TeamHistory = {
  seasons: {
    season: string;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    champion: boolean;
  }[];
  trades_with_selected_user: {
    transaction_id: string;
    season: string;
    created_at: string;
    sides: {
      roster_id: number;
      manager_name: string;
      player_ids_received: string[];
      draft_picks_received: DraftPick[];
    }[];
  }[];
  player_names: Record<string, string>;
};
type HistoryTeam = {
  roster_id: number;
  owner_id: string | null;
  manager_name: string;
  team_name: string | null;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  champion: boolean;
  finish_position: number | null;
  avatar_url: string | null;
};
type LeagueHistory = {
  seasons: {
    league_id: string;
    season: string;
    teams: HistoryTeam[];
    bracket: {
      round: number;
      match_id: number;
      team_1_roster_id: number | null;
      team_2_roster_id: number | null;
      winner_roster_id: number | null;
      loser_roster_id: number | null;
      placement: number | null;
    }[];
  }[];
};
type PickHistory = {
  pick: DraftPick;
  current_owner_id: number;
  current_owner_name: string;
  transfers: {
    transaction_id: string;
    league_season: string;
    created_at: string;
    from_manager_name: string;
    to_manager_name: string;
    trade_sides: {
      roster_id: number;
      manager_name: string;
      player_ids_received: string[];
      draft_picks_received: DraftPick[];
    }[];
  }[];
  player_names: Record<string, string>;
};
type PlayerEvent = {
  event_type: string;
  league_season: string;
  occurred_at: string | null;
  from_manager_name: string | null;
  to_manager_name: string | null;
  description: string;
  transaction_id: string | null;
  details: string[];
  sides: {
    roster_id: number;
    manager_name: string;
    assets_received: string[];
  }[];
};
type PlayerHistory = {
  player_id: string;
  player_name: string;
  events: PlayerEvent[];
};
type LeagueActivityTrade = {
  transaction_id: string;
  season: string;
  created_at: string;
  sides: { manager_name: string; assets_received: string[] }[];
};
type LeagueActivity = {
  teams: {
    owner_id: string;
    manager_name: string;
    avatar_url: string | null;
    transactions: number;
    trades: number;
  }[];
  trade_pairs: {
    owner_ids: string[];
    manager_names: string[];
    trades: number;
    trade_history: LeagueActivityTrade[];
  }[];
  seasons_scanned: string[];
};
type Context = {
  league: League;
  selected_user: User;
  selected_roster: Roster | null;
  rosters: Roster[];
  players: Record<string, Player>;
  source: { provider: string; retrieved_at: string };
};
type ScoringAudit = {
  league_id: string;
  season: number;
  week: number | null;
  eligible_positions: string[];
  scoring_settings: Record<string, number>;
  supported_scoring_keys: string[];
  unsupported_scoring_keys: string[];
  total_players: number;
  matched_players: number;
  players_with_stats: number;
  statistic_catalog: {
    key: string;
    label: string;
    category: string;
    positions: string[];
    format: string;
  }[];
  outlook_status: string;
  players: {
    sleeper_player_id: string;
    nflverse_player_id: string | null;
    player_name: string;
    roster_id: number | null;
    manager_name: string;
    position: string | null;
    avatar_url: string | null;
    matched: boolean;
    fantasy_points: number;
    games: number;
    overall_rank: number | null;
    position_rank: number | null;
    statistics: Record<string, number>;
    value_outlook: {
      source: string;
      ranking_format: string;
      effective_at: string | null;
      ecr: number;
      position_rank: number | null;
      tier: number | null;
      best_rank: number | null;
      worst_rank: number | null;
      rank_standard_deviation: number | null;
      rank_delta: number | null;
    } | null;
    breakdown: {
      scoring_key: string;
      label: string;
      statistic: number;
      multiplier: number;
      points: number;
    }[];
  }[];
  source: { provider: string; retrieved_at: string };
};
type Stage = "welcome" | "leagues" | "dashboard";
type Theme = "light" | "dark";

const RATE_STAT_KEYS = new Set([
  "completion_pct",
  "pass_yd_per_att",
  "pass_td_rate",
  "int_rate",
  "yd_per_carry",
  "catch_rate",
  "yd_per_target",
  "yd_per_reception",
  "adot",
  "yac_per_reception",
  "target_share",
  "air_yd_share",
  "wopr",
  "racr",
  "yd_per_touch",
]);

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
let activeLeagueId = "";
let activeLeagueSeason = new Date().getFullYear();
let activeChampionOwnerId: string | null = null;

function Icon({
  name,
}: {
  name: "ball" | "search" | "refresh" | "arrow" | "team" | "settings";
}) {
  const paths = {
    ball: (
      <>
        <path d="M7.2 4.2c3.5-2.3 7.8-1.8 10.6 1-1 3.5-3 6.8-5.8 9.6-2.2 2.2-4.8 3.9-7.7 5.1-2.9-4.8-1.7-11.5 2.9-15.7Z" />
        <path d="m6.3 17.7 11.4-11.4M9.1 10.1l4.8 4.8m-2.7-7.6 4.5 4.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6.1 8a7 7 0 0 1 11.7-2L20 8M4 16l2.2 2A7 7 0 0 0 18 16" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 19c.5-4 2.5-6 6-6s5.5 2 6 6m0-5c3 0 4.5 1.7 5 5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      {paths[name]}
    </svg>
  );
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.detail ?? "Something went wrong. Please try again.");
  return body as T;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [username, setUsername] = useState("");
  const [activeUsername, setActiveUsername] = useState("");
  const [season, setSeason] = useState(new Date().getFullYear());
  const [leagues, setLeagues] = useState<League[]>([]);
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("fourth-down-theme");
    const initialTheme: Theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function chooseTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("fourth-down-theme", nextTheme);
  }

  async function findLeagues(event: FormEvent) {
    event.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    try {
      const name = username.trim();
      const result = await getJson<League[]>(
        `/api/v1/sleeper/users/${encodeURIComponent(
          name
        )}/leagues?season=${season}`
      );
      setActiveUsername(name);
      setLeagues(result);
      setStage("leagues");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load leagues.");
    } finally {
      setLoading(false);
    }
  }

  async function openLeague(league: League) {
    setLoading(true);
    setError("");
    try {
      setContext(
        await getJson<Context>(
          `/api/v1/sleeper/users/${encodeURIComponent(
            activeUsername
          )}/leagues/${league.league_id}`
        )
      );
      setStage("dashboard");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to import this league."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (context) await openLeague(context.league);
  }
  function reset() {
    setStage("welcome");
    setContext(null);
    setLeagues([]);
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={reset}>
          <span className="brand-mark">
            <span className="brand-football" aria-hidden="true">
              🏈
            </span>
          </span>
          <span>
            Fourth Down<span className="brand-dot">AI</span>
          </span>
        </button>
        <div className="top-actions">
          <span className="prototype">Prototype</span>
          {stage !== "welcome" && (
            <button className="text-button" onClick={reset}>
              Switch account
            </button>
          )}
          <details className="settings-menu">
            <summary aria-label="Open settings">
              <Icon name="settings" />
              <span>Settings</span>
            </summary>
            <div className="settings-popover">
              <div className="settings-heading">
                <span>Preferences</span>
                <strong>Settings</strong>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Appearance</strong>
                  <small>Choose how Fourth Down looks.</small>
                </div>
                <div className="theme-options" aria-label="Color theme">
                  <button
                    className={theme === "light" ? "active" : ""}
                    onClick={() => chooseTheme("light")}
                    aria-pressed={theme === "light"}
                  >
                    <span aria-hidden="true">☀</span> Light
                  </button>
                  <button
                    className={theme === "dark" ? "active" : ""}
                    onClick={() => chooseTheme("dark")}
                    aria-pressed={theme === "dark"}
                  >
                    <span aria-hidden="true">☾</span> Dark
                  </button>
                </div>
              </div>
              <small className="settings-note">
                More preferences will appear here as the app expands.
              </small>
            </div>
          </details>
        </div>
      </header>
      <main className={`main ${stage === "welcome" ? "centered" : ""}`}>
        {stage === "welcome" && (
          <Welcome
            username={username}
            season={season}
            loading={loading}
            error={error}
            setUsername={setUsername}
            setSeason={setSeason}
            submit={findLeagues}
          />
        )}
        {stage === "leagues" && (
          <LeaguePicker
            username={activeUsername}
            season={season}
            leagues={leagues}
            loading={loading}
            error={error}
            select={openLeague}
            back={reset}
          />
        )}
        {stage === "dashboard" && context && (
          <Dashboard
            context={context}
            loading={loading}
            error={error}
            refresh={refresh}
            changeLeague={() => setStage("leagues")}
          />
        )}
      </main>
      <footer>
        <span>Read-only Sleeper integration</span>
        <span className="footer-separator">•</span>
        <span>Your lineup stays under your control</span>
        <span className="footer-separator">•</span>
        <a href="/privacy">Privacy &amp; data use</a>
      </footer>
    </div>
  );
}

function Welcome({
  username,
  season,
  loading,
  error,
  setUsername,
  setSeason,
  submit,
}: {
  username: string;
  season: number;
  loading: boolean;
  error: string;
  setUsername: (v: string) => void;
  setSeason: (v: number) => void;
  submit: (e: FormEvent) => void;
}) {
  return (
    <section className="welcome">
      <div className="hero-copy">
        <span className="kicker">
          <span className="live-dot" /> Your smarter sideline
        </span>
        <h1>
          Make every lineup
          <br />
          <em>your best lineup.</em>
        </h1>
        <p>
          Connect your Sleeper account and get a clear view of your leagues,
          roster, and the decisions ahead.
        </p>
      </div>
      <form className="connect-card" onSubmit={submit}>
        <div>
          <span className="step">01</span>
          <h2>Find your team</h2>
          <p>Enter your public Sleeper username. No password needed.</p>
        </div>
        <label>
          Sleeper username
          <div className="input-wrap">
            <Icon name="search" />
            <input
              autoFocus
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. gridiron_guru"
            />
          </div>
        </label>
        <label>
          Season
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={new Date().getFullYear() - n}>
                {new Date().getFullYear() - n}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={loading || !username.trim()}>
          {loading ? (
            <>
              <span className="spinner" /> Finding leagues…
            </>
          ) : (
            <>
              Continue <Icon name="arrow" />
            </>
          )}
        </button>
        <small>We only access publicly available, read-only league data.</small>
      </form>
    </section>
  );
}

function LeaguePicker({
  username,
  season,
  leagues,
  loading,
  error,
  select,
  back,
}: {
  username: string;
  season: number;
  leagues: League[];
  loading: boolean;
  error: string;
  select: (l: League) => void;
  back: () => void;
}) {
  return (
    <section className="content">
      <button className="back" onClick={back}>
        ← Back
      </button>
      <div className="page-heading">
        <div>
          <span className="kicker">Step 02</span>
          <h1>Choose a league</h1>
          <p>
            {username} · {season} season
          </p>
        </div>
        <span className="count">
          {leagues.length} {leagues.length === 1 ? "league" : "leagues"}
        </span>
      </div>
      {error && <div className="alert">{error}</div>}
      {!leagues.length ? (
        <div className="empty">
          <Icon name="team" />
          <h2>No leagues found</h2>
          <p>Try another season or check the Sleeper username.</p>
          <button className="secondary" onClick={back}>
            Try again
          </button>
        </div>
      ) : (
        <div className="league-grid">
          {leagues.map((league, index) => (
            <button
              className="league-card"
              disabled={loading}
              key={league.league_id}
              onClick={() => select(league)}
            >
              <span className="league-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="status">
                  <span />
                  {league.status.replaceAll("_", " ")}
                </span>
                <h2>{league.name}</h2>
                <p>
                  {league.total_rosters} teams ·{" "}
                  {league.roster_positions.filter((x) => x !== "BN").length}{" "}
                  starting slots
                </p>
              </div>
              <span className="open">
                <Icon name="arrow" />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Dashboard({
  context,
  loading,
  error,
  refresh,
  changeLeague,
}: {
  context: Context;
  loading: boolean;
  error: string;
  refresh: () => void;
  changeLeague: () => void;
}) {
  activeLeagueId = context.league.league_id;
  activeLeagueSeason = Number(context.league.season);
  const [selectedRosterId, setSelectedRosterId] = useState(
    context.selected_roster?.roster_id ?? context.rosters[0]?.roster_id
  );
  const [rosterSlotFilter, setRosterSlotFilter] = useState<string | null>(null);
  const [view, setView] = useState<
    "overview" | "teams" | "scoring" | "draft" | "history"
  >("overview");
  const [activity, setActivity] = useState<LeagueActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [leagueHistory, setLeagueHistory] = useState<LeagueHistory | null>(
    null
  );
  const [leagueHistoryLoading, setLeagueHistoryLoading] = useState(false);
  const [history, setHistory] = useState<TeamHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const roster =
    context.rosters.find((item) => item.roster_id === selectedRosterId) ??
    context.selected_roster;
  const isMyTeam = roster?.owner_id === context.selected_user.user_id;
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
  useEffect(() => {
    if (!roster?.owner_id || isMyTeam) {
      setHistory(null);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    getJson<TeamHistory>(
      `/api/v1/sleeper/leagues/${context.league.league_id}/team-history/${roster.owner_id}?selected_user_id=${context.selected_user.user_id}`
    )
      .then((value) => {
        if (active) setHistory(value);
      })
      .catch(() => {
        if (active) setHistory(null);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    roster?.owner_id,
    isMyTeam,
    context.league.league_id,
    context.selected_user.user_id,
  ]);
  useEffect(() => {
    if (leagueHistory) return;
    let active = true;
    setLeagueHistoryLoading(true);
    getJson<LeagueHistory>(
      `/api/v1/sleeper/leagues/${context.league.league_id}/history`
    )
      .then((value) => {
        if (active) setLeagueHistory(value);
      })
      .finally(() => {
        if (active) setLeagueHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [leagueHistory, context.league.league_id]);
  useEffect(() => {
    if (view !== "overview" || activity) return;
    let active = true;
    setActivityLoading(true);
    getJson<LeagueActivity>(
      `/api/v1/sleeper/leagues/${context.league.league_id}/activity`
    )
      .then((value) => {
        if (active) setActivity(value);
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, activity, context.league.league_id]);
  useEffect(() => setRosterSlotFilter(null), [selectedRosterId]);
  const reigningChampion = useMemo(
    () =>
      leagueHistory?.seasons
        .flatMap((season) =>
          season.teams
            .filter((team) => team.champion)
            .map((team) => ({ season: season.season, team }))
        )
        .sort((a, b) => Number(b.season) - Number(a.season))[0] ?? null,
    [leagueHistory]
  );
  activeChampionOwnerId = reigningChampion?.team.owner_id ?? null;
  const championActivity = useMemo(() => {
    const championOwnerId = reigningChampion?.team.owner_id;
    if (!activity || !championOwnerId) return activity;
    const championName = activity.teams.find(
      (team) => team.owner_id === championOwnerId
    )?.manager_name;
    const mark = (name: string) => (name.endsWith(" 🏆") ? name : `${name} 🏆`);
    return {
      ...activity,
      teams: activity.teams.map((team) =>
        team.owner_id === championOwnerId
          ? { ...team, manager_name: mark(team.manager_name) }
          : team
      ),
      trade_pairs: activity.trade_pairs.map((pair) => ({
        ...pair,
        manager_names: pair.manager_names.map((name, index) =>
          pair.owner_ids[index] === championOwnerId ? mark(name) : name
        ),
        trade_history: pair.trade_history.map((trade) => ({
          ...trade,
          sides: trade.sides.map((side) =>
            championName && side.manager_name === championName
              ? { ...side, manager_name: mark(side.manager_name) }
              : side
          ),
        })),
      })),
    };
  }, [activity, reigningChampion?.team.owner_id]);
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
              <p>{context.selected_user.display_name}&apos;s team</p>
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
          Teams & rosters
        </button>
        <button
          className={view === "scoring" ? "active" : ""}
          onClick={() => setView("scoring")}
        >
          Statistics
        </button>
        <button
          className={view === "draft" ? "active" : ""}
          onClick={() => setView("draft")}
        >
          Draft capital
        </button>

        <button
          className={view === "history" ? "active" : ""}
          onClick={() => setView("history")}
        >
          League history
        </button>
      </nav>
      {view === "overview" ? (
        <LeagueOverview
          activity={championActivity}
          loading={activityLoading}
          rosters={context.rosters}
          onOpenRoster={(rosterId) => {
            setSelectedRosterId(rosterId);
            setView("teams");
          }}
        />
      ) : view === "history" ? (
        <LeagueHistoryView
          history={leagueHistory}
          loading={leagueHistoryLoading}
        />
      ) : view === "draft" ? (
        <DraftBoard rosters={context.rosters} />
      ) : view === "scoring" ? (
        <StatisticsView league={context.league} />
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
              />
              <PlayerGroup
                title="Bench"
                group="bench"
                playerIds={bench}
                catalog={context.players}
                filter={rosterSlotFilter}
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
                />
              )}{" "}
              {roster.reserve.length > 0 && (
                <PlayerGroup
                  title="Injured reserve"
                  group="reserve"
                  playerIds={roster.reserve}
                  catalog={context.players}
                  filter={rosterSlotFilter}
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
            <DraftPicks
              picks={roster.draft_picks}
              leagueId={context.league.league_id}
              catalog={context.players}
            />
            {!isMyTeam && (
              <SeasonHistory history={history} loading={historyLoading} />
            )}{" "}
            {!isMyTeam && (
              <TradeHistory
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

function StatisticsView({ league }: { league: League }) {
  const defaultSeason = Math.max(1999, Number(league.season) - 1);
  const [season, setSeason] = useState(defaultSeason);
  const [week, setWeek] = useState<number | null>(null);
  const [audit, setAudit] = useState<ScoringAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"statistics" | "transactions">(
    "statistics"
  );
  const [histories, setHistories] = useState<Record<string, PlayerHistory>>({});
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [rosterStatus, setRosterStatus] = useState<
    "all" | "rostered" | "available"
  >("all");
  const [statDisplay, setStatDisplay] = useState<"total" | "perGame">("total");
  const [selectedMetricKeys, setSelectedMetricKeys] = useState<string[]>([]);
  const [sort, setSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "points", direction: "desc" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const weekQuery = week ? `&week=${week}` : "";
    getJson<ScoringAudit>(
      `/api/v1/sleeper/leagues/${league.league_id}/statistics?season=${season}${weekQuery}`
    )
      .then((result) => {
        if (active) setAudit(result);
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
    const query = search.trim().toLowerCase();
    const result = audit.players.filter((player) => {
      const matchesSearch =
        !query ||
        player.player_name.toLowerCase().includes(query) ||
        player.manager_name.toLowerCase().includes(query) ||
        (player.position ?? "").toLowerCase().includes(query);
      const matchesPosition =
        position === "ALL" || player.position === position;
      const matchesRoster =
        rosterStatus === "all" ||
        (rosterStatus === "rostered" && player.roster_id !== null) ||
        (rosterStatus === "available" && player.roster_id === null);
      return matchesSearch && matchesPosition && matchesRoster;
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

  function changeSort(key: string) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction:
              key === "player" || key === "outlook" ? "asc" : "desc",
          }
    );
  }

  const arrow = (key: string) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const metricCategory = (key: string) => {
    if (["pass_att", "rush_att", "targets", "touches", "opportunities"].includes(key))
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
  const defaultStatisticColumns = useMemo<
    { key: string; label: string; category: string; format: string }[]
  >(() => {
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
  const activeMetricKeys = selectedMetricKeys.length
    ? selectedMetricKeys
    : defaultStatisticColumns.map((metric) => metric.key);
  const metricCategories = Array.from(
    new Set(availableMetricColumns.map((metric) => metric.category))
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
      <div className="scoring-head">
        <div>
          <span className="eyebrow">League statistics</span>
          <h2>Player stat leaders</h2>
          <p>
            Explore fantasy-relevant production using this league&apos;s
            positions and scoring rules. Select any column to rank the league.
          </p>
        </div>
        <div className="scoring-controls">
          <label>
            Season
            <select
              value={season}
              onChange={(event) => setSeason(Number(event.target.value))}
            >
              {Array.from(
                { length: 5 },
                (_, index) => Number(league.season) - index
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Period
            <select
              value={week ?? "all"}
              onChange={(event) =>
                setWeek(
                  event.target.value === "all"
                    ? null
                    : Number(event.target.value)
                )
              }
            >
              <option value="all">Full regular season</option>
              {Array.from({ length: 18 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    Week {value}
                  </option>
                )
              )}
            </select>
          </label>
          <label>
            Display
            <select
              value={statDisplay}
              onChange={(event) =>
                setStatDisplay(event.target.value as "total" | "perGame")
              }
            >
              <option value="total">Season totals</option>
              <option value="perGame">Per game</option>
            </select>
          </label>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <div className="scoring-loading">Loading public player statistics…</div>
      ) : audit ? (
        <>
          <div className="leader-toolbar">
            <div className="leader-search">
              <Icon name="search" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search players, positions, or managers"
                aria-label="Search stat leaders"
              />
            </div>
            <div className="position-filters" aria-label="Filter by position">
              {["ALL", ...audit.eligible_positions].map((value) => (
                <button
                  key={value}
                  className={position === value ? "active" : ""}
                  onClick={() => setPosition(value)}
                  aria-pressed={position === value}
                >
                  {value}
                </button>
              ))}
            </div>
            <div
              className="ownership-filter"
              aria-label="Filter by roster status"
            >
              {(["all", "rostered", "available"] as const).map((value) => (
                <button
                  key={value}
                  className={rosterStatus === value ? "active" : ""}
                  onClick={() => setRosterStatus(value)}
                  aria-pressed={rosterStatus === value}
                >
                  {value === "all"
                    ? "All players"
                    : value === "rostered"
                    ? "Rostered"
                    : "Available"}
                </button>
              ))}
            </div>
            <span className="leader-count">{players.length} players</span>
          </div>
          <details className="metric-customizer">
            <summary>
              <span>
                <strong>Customize stat columns</strong>
                <small>
                  {selectedMetricKeys.length
                    ? `${selectedMetricKeys.length} custom metrics selected`
                    : "Using the recommended position preset"}
                </small>
              </span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className="metric-customizer-body">
              <div className="metric-presets" aria-label="Statistic presets">
                <button
                  type="button"
                  className={selectedMetricKeys.length === 0 ? "active" : ""}
                  onClick={() => setSelectedMetricKeys([])}
                >
                  Recommended
                </button>
                {metricCategories.map((category) => {
                  const keys = availableMetricColumns
                    .filter((metric) => metric.category === category)
                    .map((metric) => metric.key);
                  const selected =
                    keys.length > 0 &&
                    keys.every((key) => selectedMetricKeys.includes(key));
                  return (
                    <button
                      type="button"
                      key={category}
                      className={selected ? "active" : ""}
                      onClick={() => setSelectedMetricKeys(keys)}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              <div className="metric-options">
                {availableMetricColumns.map((metric) => (
                  <label key={metric.key}>
                    <input
                      type="checkbox"
                      checked={activeMetricKeys.includes(metric.key)}
                      onChange={() =>
                        setSelectedMetricKeys((current) => {
                          const base = current.length
                            ? current
                            : defaultStatisticColumns.map(
                                (column) => column.key
                              );
                          return base.includes(metric.key)
                            ? base.filter((key) => key !== metric.key)
                            : [...base, metric.key];
                        })
                      }
                    />
                    <span>
                      <strong>{metric.label}</strong>
                      <small>{metric.category}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </details>
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
          <div className="scoring-table-wrap">
            <table className="scoring-table">
              <thead>
                <tr>
                  <th className="rank-column">Rank</th>
                  <th>
                    <button onClick={() => changeSort("player")}>
                      Player{arrow("player")}
                    </button>
                  </th>
                  <th>
                    <button onClick={() => changeSort("outlook")}>
                      Dynasty ECR{arrow("outlook")}
                    </button>
                  </th>
                  {statisticColumns.map((column) => (
                    <th key={column.key}>
                      <button onClick={() => changeSort(`stat:${column.key}`)}>
                        {column.label}
                        {statDisplay === "perGame" &&
                        !RATE_STAT_KEYS.has(column.key)
                          ? "/G"
                          : ""}
                        {arrow(`stat:${column.key}`)}
                      </button>
                    </th>
                  ))}
                  <th>
                    <button onClick={() => changeSort("points")}>
                      {statDisplay === "perGame" ? "FPTS/G" : "Fantasy points"}
                      {arrow("points")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => {
                  const isOpen = expanded === player.sleeper_player_id;
                  return (
                    <Fragment
                      key={`${player.roster_id}-${player.sleeper_player_id}`}
                    >
                      <tr
                        className={player.matched ? "" : "unmatched"}
                        onClick={() => {
                          setExpanded(isOpen ? null : player.sleeper_player_id);
                          setDetailTab("statistics");
                        }}
                      >
                        <td className="rank-column">
                          <strong>{index + 1}</strong>
                        </td>
                        <td className="outlook-cell">
                          {player.value_outlook ? (
                            <>
                              <strong>#{Math.round(player.value_outlook.ecr)}</strong>
                              <small>
                                {player.value_outlook.position_rank
                                  ? `${player.position ?? "POS"}${player.value_outlook.position_rank}`
                                  : "Consensus"}{" "}
                                · Tier {player.value_outlook.tier ?? "—"}
                              </small>
                            </>
                          ) : (
                            <span>—</span>
                          )}
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
                        {statisticColumns.map((column) => (
                          <td key={column.key} className="stat-value">
                            {formatMetric(
                              statDisplay === "perGame" &&
                                player.games > 0 &&
                                !RATE_STAT_KEYS.has(column.key)
                                ? (player.statistics[column.key] ?? 0) /
                                    player.games
                                : player.statistics[column.key] ?? 0,
                              column.format
                            )}
                          </td>
                        ))}
                        <td>
                          <strong className="leader-points">
                            {(statDisplay === "perGame" && player.games > 0
                              ? player.fantasy_points / player.games
                              : player.fantasy_points
                            ).toFixed(1)}
                          </strong>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="scoring-detail-row">
                          <td colSpan={statisticColumns.length + 4}>
                            <PlayerStatisticsCard
                              player={player}
                              season={season}
                              week={week}
                              tab={detailTab}
                              onTabChange={setDetailTab}
                              history={
                                histories[player.sleeper_player_id] ?? null
                              }
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

function formatStatistic(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMetric(value: number, format?: string) {
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "decimal")
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return formatStatistic(value);
}

const STAT_LABELS: Record<string, string> = {
  pass_cmp: "Completions",
  pass_att: "Pass attempts",
  pass_yd: "Passing yards",
  pass_td: "Passing TD",
  pass_int: "Interceptions thrown",
  rush_att: "Carries",
  rush_yd: "Rushing yards",
  rush_td: "Rushing TD",
  rec: "Receptions",
  rec_yd: "Receiving yards",
  rec_td: "Receiving TD",
  fum_lost: "Fumbles lost",
  total_td: "Total touchdowns",
  sack: "Sacks",
  int: "Defensive interceptions",
  ff: "Forced fumbles",
  fum_rec: "Fumble recoveries",
  def_td: "Defensive TD",
  def_4_and_stop: "Fourth-down stops",
  blk_kick: "Blocked kicks",
  targets: "Targets",
  air_yd: "Air yards",
  yac: "Yards after catch",
  pass_epa: "Passing EPA",
  rush_epa: "Rushing EPA",
  rec_epa: "Receiving EPA",
  completion_pct: "Completion percentage",
  pass_yd_per_att: "Passing yards per attempt",
  pass_td_rate: "Passing TD rate",
  int_rate: "Interception rate",
  yd_per_carry: "Yards per carry",
  catch_rate: "Catch rate",
  yd_per_target: "Yards per target",
  yd_per_reception: "Yards per reception",
  adot: "Average depth of target",
  yac_per_reception: "YAC per reception",
  target_share: "Target share",
  air_yd_share: "Air-yards share",
  wopr: "WOPR",
  racr: "RACR",
  touches: "Touches",
  opportunities: "Opportunities",
  yd_per_touch: "Yards per touch",
};

function PlayerStatisticsCard({
  player,
  season,
  week,
  tab,
  onTabChange,
  history,
}: {
  player: ScoringAudit["players"][number];
  season: number;
  week: number | null;
  tab: "statistics" | "transactions";
  onTabChange: (tab: "statistics" | "transactions") => void;
  history: PlayerHistory | null;
}) {
  const [historyOrder, setHistoryOrder] = useState<"newest" | "oldest">(
    "newest"
  );
  const visibleStatistics = Object.entries(player.statistics)
    .filter(([key, value]) => value !== 0 && key in STAT_LABELS)
    .sort(([left], [right]) =>
      (STAT_LABELS[left] ?? left).localeCompare(STAT_LABELS[right] ?? right)
    );
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
                      ? `${player.position ?? "POS"}${player.value_outlook.position_rank}`
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
          <div className="player-stat-content">
            <div className="player-stat-grid">
              {visibleStatistics.map(([key, value]) => (
                <div key={key}>
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
                </div>
              ))}
            </div>
            <section className="fantasy-breakdown">
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
            </section>
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
function LeagueOverview({
  activity,
  loading,
  rosters,
  onOpenRoster,
}: {
  activity: LeagueActivity | null;
  loading: boolean;
  rosters: Roster[];
  onOpenRoster: (rosterId: number) => void;
}) {
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
  const rosterForOwner = (ownerId: string) =>
    rosters.find((roster) => roster.owner_id === ownerId);
  const Leader = ({
    label,
    team,
    value,
  }: {
    label: string;
    team: LeagueActivity["teams"][number] | undefined;
    value: number | undefined;
  }) => (
    <article className="activity-leader">
      <span>{label}</span>
      {team && (
        <button
          type="button"
          className="activity-leader-link"
          disabled={!rosterForOwner(team.owner_id)}
          onClick={() => {
            const roster = rosterForOwner(team.owner_id);
            if (roster) onOpenRoster(roster.roster_id);
          }}
          aria-label={`View ${team.manager_name}'s roster`}
        >
          {team.avatar_url ? (
            <img src={team.avatar_url} alt="" />
          ) : (
            <i>{team.manager_name.slice(0, 2).toUpperCase()}</i>
          )}
          <div>
            <strong>{team.manager_name}</strong>
            <small>
              {value}{" "}
              {label.toLowerCase().includes("trade")
                ? "trades"
                : "transactions"}
            </small>
          </div>
        </button>
      )}
    </article>
  );
  return (
    <section className="activity-dashboard">
      <div className="archive-head">
        <span className="eyebrow">League pulse</span>
        <h2>League dashboard</h2>
        <p>
          Live standings and completed Sleeper activity across{" "}
          {activity.seasons_scanned.length} season
          {activity.seasons_scanned.length === 1 ? "" : "s"}:{" "}
          {activity.seasons_scanned.join(", ")}.
        </p>
      </div>
      <div className="activity-leaders">
        <Leader
          label="Most trades"
          team={byTrades[0]}
          value={byTrades[0]?.trades}
        />
        <Leader
          label="Most transactions"
          team={byTransactions[0]}
          value={byTransactions[0]?.transactions}
        />
        <Leader
          label="Least trades"
          team={leastTrades[0]}
          value={leastTrades[0]?.trades}
        />
        <Leader
          label="Least transactions"
          team={leastTransactions[0]}
          value={leastTransactions[0]?.transactions}
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
                  disabled={!rosterForOwner(team.owner_id)}
                  onClick={() => {
                    const roster = rosterForOwner(team.owner_id);
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
        <LiveStandings rosters={rosters} onOpenRoster={onOpenRoster} />
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
}: {
  rosters: Roster[];
  onOpenRoster: (rosterId: number) => void;
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
              className={
                `standing-roster-link ${
                  index < 3
                    ? `standing-podium standing-podium-${index + 1}`
                    : ""
                }`
              }
              key={team.roster_id}
              onClick={() => onOpenRoster(team.roster_id)}
              aria-label={`View ${teamLabel(team)} roster`}
            >
              <b>{medals[index] ?? index + 1}</b>
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
                <strong>{teamLabel(team)}</strong>
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
  if (!pairs.length)
    return <p className="loading-copy">No completed trades were found.</p>;
  const visible = expanded ? pairs : pairs.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="pair-list">
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
  return (
    <div className="pair-trade">
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
function pickLabel(pick: DraftPick) {
  return pick.pick_number
    ? `${pick.season}, Round ${pick.round}, Pick ${pick.pick_number} overall`
    : `${pick.season} Round ${pick.round}`;
}
const TEAM_COLORS = [
  "#0072b2",
  "#d55e00",
  "#009e73",
  "#cc79a7",
  "#e69f00",
  "#6f42c1",
  "#f04452",
  "#1b7f79",
  "#8b5a2b",
  "#5d67d8",
];
function teamLabel(roster: Roster) {
  return `${
    roster.team_name ?? roster.owner_display_name ?? `Team ${roster.roster_id}`
  }${roster.owner_id === activeChampionOwnerId ? " 🏆" : ""}`;
}
function DraftBoard({ rosters }: { rosters: Roster[] }) {
  const seasons = Array.from(
    new Set(
      rosters.flatMap((roster) => roster.draft_picks.map((pick) => pick.season))
    )
  ).sort();
  const [season, setSeason] = useState(seasons[0] ?? "");
  const [focusedOwner, setFocusedOwner] = useState<number | null>(null);
  const picks = rosters.flatMap((owner) =>
    owner.draft_picks
      .filter((pick) => pick.season === season)
      .map((pick) => ({ pick, owner }))
  );
  const rounds = Array.from(new Set(picks.map((item) => item.pick.round))).sort(
    (a, b) => a - b
  );
  return (
    <section className="panel draft-board">
      <div className="board-head">
        <div>
          <span className="eyebrow">League view</span>
          <h2>Draft capital board</h2>
          <p>
            Order is unknown. Select a team to highlight every pick it currently
            owns.
          </p>
        </div>
        <select
          value={season}
          onChange={(event) => setSeason(event.target.value)}
        >
          {seasons.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="team-legend">
        <button
          className={focusedOwner === null ? "selected" : ""}
          onClick={() => setFocusedOwner(null)}
        >
          All teams
        </button>
        {rosters.map((team, index) => (
          <button
            className={focusedOwner === team.roster_id ? "selected" : ""}
            onClick={() =>
              setFocusedOwner((current) =>
                current === team.roster_id ? null : team.roster_id
              )
            }
            key={team.roster_id}
          >
            <i
              style={{
                backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length],
              }}
            />
            {teamLabel(team)}
          </button>
        ))}
      </div>
      <div className="round-board">
        {rounds.map((round) => (
          <div className="round-row" key={round}>
            <strong className="round-label">Round {round}</strong>
            <div className="round-picks">
              {picks
                .filter((item) => item.pick.round === round)
                .sort(
                  (a, b) =>
                    a.pick.original_roster_id - b.pick.original_roster_id
                )
                .map(({ pick, owner }) => {
                  const ownerIndex = rosters.findIndex(
                    (team) => team.roster_id === owner.roster_id
                  );
                  const muted =
                    focusedOwner !== null && focusedOwner !== owner.roster_id;
                  return (
                    <div
                      className={`board-pick ${muted ? "muted" : ""} ${
                        focusedOwner === owner.roster_id ? "focused" : ""
                      }`}
                      style={{
                        borderTopColor:
                          TEAM_COLORS[ownerIndex % TEAM_COLORS.length],
                      }}
                      key={`${round}-${pick.original_roster_id}`}
                    >
                      <span>
                        Originally:{" "}
                        {pick.original_owner_name ??
                          `Team ${pick.original_roster_id}`}
                      </span>
                      <small>Current owner</small>
                      <strong>{teamLabel(owner)}</strong>
                      {pick.acquired && <em>Acquired via trade</em>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function DraftPicks({
  picks,
  leagueId,
  catalog,
}: {
  picks: DraftPick[];
  leagueId: string;
  catalog: Record<string, Player>;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<PickHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const keyFor = (pick: DraftPick) =>
    `${pick.season}-${pick.round}-${pick.original_roster_id}`;
  async function inspect(pick: DraftPick) {
    const key = keyFor(pick);
    if (selectedKey === key) {
      setSelectedKey(null);
      setSelected(null);
      return;
    }
    setSelectedKey(key);
    setLoading(true);
    setSelected(null);
    try {
      setSelected(
        await getJson<PickHistory>(
          `/api/v1/sleeper/leagues/${leagueId}/pick-history?season=${pick.season}&round_number=${pick.round}&original_roster_id=${pick.original_roster_id}`
        )
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className={`panel pick-panel ${selectedKey ? "expanded" : ""}`}>
      <span className="eyebrow">Dynasty assets</span>
      <h2>Draft picks</h2>
      <div className="pick-list">
        {picks.map((pick, i) => {
          const key = keyFor(pick);
          const expanded = selectedKey === key;
          return (
            <div
              className={`pick-card ${expanded ? "expanded" : ""}`}
              key={`${key}-${i}`}
            >
              <button
                className={`pick-summary ${pick.acquired ? "acquired" : ""}`}
                onClick={() => inspect(pick)}
                aria-expanded={expanded}
              >
                <b>{pickLabel(pick)}</b>
                <small>
                  {pick.acquired
                    ? `From ${
                        pick.original_owner_name ??
                        `Team ${pick.original_roster_id}`
                      }`
                    : "Own pick"}
                </small>
              </button>
              {expanded && loading && (
                <p className="loading-copy">Tracing pick history…</p>
              )}
              {expanded && selected && (
                <div className="pick-history">
                  <div className="lineage-head">
                    <div>
                      <span>Pick lineage</span>
                      <strong>{pickLabel(selected.pick)}</strong>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedKey(null);
                        setSelected(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <p>
                    Originally {selected.pick.original_owner_name} · now owned
                    by {selected.current_owner_name}
                  </p>
                  {selected.transfers.length ? (
                    selected.transfers.map((move, index) => (
                      <article key={move.transaction_id}>
                        <div className="transfer-marker">{index + 1}</div>
                        <div>
                          <strong>
                            {move.from_manager_name} → {move.to_manager_name}
                          </strong>
                          <small>
                            {new Date(move.created_at).toLocaleDateString()} ·{" "}
                            {move.league_season} league
                          </small>
                          <TradeComparison
                            transactionId={move.transaction_id}
                            sides={move.trade_sides.map((side) => ({
                              roster_id: side.roster_id,
                              manager_name: side.manager_name,
                              assets_received: [
                                ...side.player_ids_received.map(
                                  (id) =>
                                    selected.player_names[id] ??
                                    catalog[id]?.full_name ??
                                    `Player ${id}`
                                ),
                                ...side.draft_picks_received.map((pick) =>
                                  pickLabel(pick)
                                ),
                              ],
                            }))}
                          />
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="loading-copy">
                      This is the original team&apos;s native pick; no transfers
                      found.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
function SeasonHistory({
  history,
  loading,
}: {
  history: TeamHistory | null;
  loading: boolean;
}) {
  return (
    <section className="panel">
      <span className="eyebrow">Manager history</span>
      <h2>Previous seasons</h2>
      {loading ? (
        <p className="loading-copy">Loading dynasty history…</p>
      ) : history?.seasons.length ? (
        <div className="history-list">
          {history.seasons.map((item) => (
            <div key={item.season}>
              <strong>
                {item.season}
                {item.champion && <b className="champion">Champion</b>}
              </strong>
              <span>
                {item.wins}–{item.losses}
                {item.ties ? `–${item.ties}` : ""}
              </span>
              <small>{item.points.toFixed(2)} PF</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="loading-copy">No prior seasons found for this owner.</p>
      )}
    </section>
  );
}
function LeagueHistoryView({
  history,
  loading,
}: {
  history: LeagueHistory | null;
  loading: boolean;
}) {
  if (loading)
    return (
      <div className="empty">
        <span className="spinner dark" />
        <h2>Loading league history…</h2>
      </div>
    );
  return (
    <section className="history-archive">
      <div className="archive-head">
        <span className="eyebrow">Dynasty archive</span>
        <h2>League history</h2>
        <p>
          Final placements, regular-season performance, playoff brackets, and
          franchise trends.
        </p>
      </div>
      {history && <FinishTrends history={history} />}{" "}
      {history?.seasons.map((season) => (
        <HistorySeason key={season.league_id} season={season} />
      ))}
    </section>
  );
}
function colorFor(ownerId: string | null) {
  let hash = 0;
  for (const char of ownerId ?? "team")
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}
function HistorySeason({
  season,
}: {
  season: LeagueHistory["seasons"][number];
}) {
  const [sort, setSort] = useState<"finish" | "record" | "points">("finish");
  const [open, setOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const teams = [...season.teams].sort((a, b) =>
    sort === "points"
      ? b.points - a.points
      : sort === "record"
      ? b.wins - a.wins || b.points - a.points
      : (a.finish_position ?? 999) - (b.finish_position ?? 999)
  );
  return (
    <section className="panel season-table">
      <button
        className="season-toggle"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <strong>{season.season}</strong>
          <small>
            {season.teams.find((team) => team.champion)?.manager_name ??
              "Champion TBD"}{" "}
            · Champion
          </small>
        </span>
        <b>{open ? "−" : "+"}</b>
      </button>
      {open && (
        <>
          <div className="season-tools">
            <button
              className="bracket-button"
              onClick={() => setBracketOpen((value) => !value)}
            >
              {bracketOpen ? "Show standings" : "View playoff bracket"}
            </button>
          </div>
          {bracketOpen ? (
            <PlayoffBracket season={season} />
          ) : (
            <>
              <div className="standings-head">
                <button
                  className={sort === "finish" ? "active" : ""}
                  onClick={() => setSort("finish")}
                >
                  Final finish
                </button>
                <button
                  className={sort === "record" ? "active" : ""}
                  onClick={() => setSort("record")}
                >
                  Record
                </button>
                <button
                  className={sort === "points" ? "active" : ""}
                  onClick={() => setSort("points")}
                >
                  Points
                </button>
              </div>
              {teams.map((team) => (
                <div
                  className={`standing ${team.champion ? "winner" : ""}`}
                  key={team.roster_id}
                  style={{ borderLeftColor: colorFor(team.owner_id) }}
                >
                  <span className="rank">{team.finish_position ?? "—"}</span>
                  {team.avatar_url ? (
                    <img
                      className="history-logo"
                      src={team.avatar_url}
                      alt=""
                    />
                  ) : (
                    <span
                      className="history-logo fallback"
                      style={{ background: colorFor(team.owner_id) }}
                    >
                      {team.manager_name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>{team.manager_name}</strong>
                    <small>
                      {team.team_name ?? "Team name unavailable"}
                      {team.champion && <b className="champion">Champion</b>}
                    </small>
                  </div>
                  <span>
                    {team.wins}–{team.losses}
                    {team.ties ? `–${team.ties}` : ""}
                  </span>
                  <span>{team.points.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
function PlayoffBracket({
  season,
}: {
  season: LeagueHistory["seasons"][number];
}) {
  const rounds = Array.from(
    new Set(season.bracket.map((match) => match.round))
  ).sort((a, b) => a - b);
  const team = (id: number | null) =>
    season.teams.find((item) => item.roster_id === id);
  return (
    <div
      className="playoff-bracket"
      aria-label={`${season.season} playoff bracket`}
    >
      {rounds.map((round, roundIndex) => (
        <div className="bracket-round" key={round}>
          <h4>
            {roundIndex === rounds.length - 1 ? "Finals" : `Round ${round}`}
          </h4>
          <div className="bracket-games">
            {season.bracket
              .filter((match) => match.round === round)
              .map((match) => (
                <article
                  className={`bracket-match ${
                    match.placement === 1 ? "championship" : ""
                  }`}
                  key={match.match_id}
                >
                  {match.placement === 1 && (
                    <small className="title-game">🏆 Championship</small>
                  )}
                  {[match.team_1_roster_id, match.team_2_roster_id].map(
                    (id, index) => {
                      const entry = team(id);
                      const won = id !== null && match.winner_roster_id === id;
                      return (
                        <div
                          className={won ? "won" : ""}
                          key={`${match.match_id}-${index}`}
                        >
                          {entry?.avatar_url ? (
                            <img src={entry.avatar_url} alt="" />
                          ) : (
                            <i
                              style={{
                                background: colorFor(entry?.owner_id ?? null),
                              }}
                            >
                              {entry?.manager_name.slice(0, 2).toUpperCase() ??
                                "?"}
                            </i>
                          )}
                          <span>
                            <strong>
                              {entry?.manager_name ??
                                (id ? `Team ${id}` : "BYE")}
                            </strong>
                            {entry?.finish_position && (
                              <small>
                                {ordinal(entry.finish_position)} place
                              </small>
                            )}
                          </span>
                          {won && <b>✓</b>}
                        </div>
                      );
                    }
                  )}
                </article>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function ordinal(value: number) {
  const suffix =
    value % 10 === 1 && value % 100 !== 11
      ? "st"
      : value % 10 === 2 && value % 100 !== 12
      ? "nd"
      : value % 10 === 3 && value % 100 !== 13
      ? "rd"
      : "th";
  return `${value}${suffix}`;
}
function FinishTrends({ history }: { history: LeagueHistory }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const seasons = [...history.seasons].reverse();
  const owners = new Map<
    string,
    { name: string; color: string; values: Map<string, number> }
  >();
  for (const season of seasons)
    for (const team of season.teams)
      if (team.owner_id && team.finish_position) {
        const entry = owners.get(team.owner_id) ?? {
          name: team.manager_name,
          color: colorFor(team.owner_id),
          values: new Map(),
        };
        entry.name = team.manager_name;
        entry.values.set(season.season, team.finish_position);
        owners.set(team.owner_id, entry);
      }
  const visible = selected.size
    ? Array.from(owners.entries()).filter(([id]) => selected.has(id))
    : Array.from(owners.entries());
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const width = 900,
    height = 300,
    left = 48,
    top = 22,
    bottom = 38,
    maxTeams = Math.max(...history.seasons.map((item) => item.teams.length));
  const x = (index: number) =>
    left +
    index * Math.max(1, (width - left - 20) / Math.max(1, seasons.length - 1));
  const y = (finish: number) =>
    top + ((finish - 1) * (height - top - bottom)) / Math.max(1, maxTeams - 1);
  return (
    <section className="panel trends">
      <div className="panel-head">
        <div>
          <span className="eyebrow">Across seasons</span>
          <h2>Finish trends</h2>
        </div>
        <span className="data-note">
          Select one or more managers · 1st at top
        </span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Team finishing position by season"
        >
          {Array.from({ length: maxTeams }, (_, i) => (
            <g key={i}>
              <line
                x1={left}
                x2={width - 20}
                y1={y(i + 1)}
                y2={y(i + 1)}
                className="chart-grid"
              />
              <text x={left - 12} y={y(i + 1) + 4}>
                {i + 1}
              </text>
            </g>
          ))}
          {seasons.map((season, index) => (
            <text
              key={season.season}
              x={x(index)}
              y={height - 10}
              textAnchor="middle"
            >
              {season.season}
            </text>
          ))}
          {visible.map(([id, team]) => {
            const points = seasons
              .map((season, index) => {
                const finish = team.values.get(season.season);
                return finish ? `${x(index)},${y(finish)}` : null;
              })
              .filter(Boolean)
              .join(" ");
            return (
              <g key={id}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={team.color}
                  strokeWidth="3"
                />
                {seasons.map((season, index) => {
                  const finish = team.values.get(season.season);
                  return finish ? (
                    <circle
                      key={season.season}
                      cx={x(index)}
                      cy={y(finish)}
                      r="5"
                      fill={team.color}
                    />
                  ) : null;
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="chart-legend">
        {Array.from(owners.entries()).map(([id, team]) => (
          <button
            className={
              selected.has(id) ? "selected" : selected.size ? "muted" : ""
            }
            onClick={() => toggle(id)}
            key={id}
          >
            <i style={{ background: team.color }} />
            {team.name}
          </button>
        ))}
      </div>
    </section>
  );
}
function TradeHistory({
  history,
  loading,
  catalog,
}: {
  history: TeamHistory | null;
  loading: boolean;
  catalog: Record<string, Player>;
}) {
  return (
    <section className="panel trade-panel">
      <span className="eyebrow">Relationship</span>
      <h2>Trades with you</h2>
      {loading ? (
        <p className="loading-copy">Checking transaction history…</p>
      ) : history?.trades_with_selected_user.length ? (
        <div className="trade-list">
          {history.trades_with_selected_user.map((trade) => (
            <article key={trade.transaction_id}>
              <header>
                <strong>{trade.season} trade</strong>
                <span>{new Date(trade.created_at).toLocaleDateString()}</span>
              </header>
              {trade.sides.map((side) => (
                <div className="trade-side" key={side.roster_id}>
                  <b>{side.manager_name} received</b>
                  {side.player_ids_received.map((id) => (
                    <small key={id}>
                      {history.player_names[id] ??
                        catalog[id]?.full_name ??
                        `Player ${id}`}
                    </small>
                  ))}
                  {side.draft_picks_received.map((pick, i) => (
                    <small key={`${pick.season}-${pick.round}-${i}`}>
                      {pickLabel(pick)} · originally{" "}
                      {pick.original_owner_name ??
                        `Team ${pick.original_roster_id}`}
                    </small>
                  ))}
                  {!side.player_ids_received.length &&
                    !side.draft_picks_received.length && (
                      <small>No cataloged assets</small>
                    )}
                </div>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <p className="loading-copy">
          No completed trades found between these managers.
        </p>
      )}
    </section>
  );
}
function playerMatchesRosterSlot(
  player: Player | undefined,
  slot: string | null,
  group: string
) {
  if (!slot) return true;
  if (slot === "BN") return group === "bench";
  if (slot === "TAXI") return group === "taxi";
  if (slot === "IR") return group === "reserve";
  const eligible = new Set(
    [player?.position, ...(player?.eligible_positions ?? [])].filter(
      (position): position is string => Boolean(position)
    )
  );
  if (slot === "FLEX")
    return ["RB", "WR", "TE"].some((position) => eligible.has(position));
  if (slot === "SUPER_FLEX")
    return ["QB", "RB", "WR", "TE"].some((position) => eligible.has(position));
  if (slot === "REC_FLEX")
    return ["WR", "TE"].some((position) => eligible.has(position));
  return eligible.has(slot);
}
function PlayerGroup({
  title,
  group,
  playerIds,
  catalog,
  filter,
  accent = false,
}: {
  title: string;
  group: "starters" | "bench" | "taxi" | "reserve";
  playerIds: string[];
  catalog: Record<string, Player>;
  filter: string | null;
  accent?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      const season = Math.max(1999, activeLeagueSeason - 1);
      const [playerHistory, leagueStatistics] = await Promise.all([
        getJson<PlayerHistory>(
          `/api/v1/sleeper/leagues/${activeLeagueId}/player-history/${id}`
        ),
        getJson<ScoringAudit>(
          `/api/v1/sleeper/leagues/${activeLeagueId}/statistics?season=${season}`
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
        <div className="player-list">
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
function PlayerHistoryEvent({
  event,
  index,
}: {
  event: PlayerEvent;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = event.sides.length > 0 || event.details.length > 0;
  return (
    <div className="player-event">
      <i>{index + 1}</i>
      <div>
        <strong>{event.description}</strong>
        <small>
          {event.league_season}
          {event.occurred_at
            ? ` · ${new Date(event.occurred_at).toLocaleDateString()}`
            : ""}
        </small>
        {hasDetails && (
          <button
            className="event-details-toggle"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide details" : "View all details"}
          </button>
        )}
        {open &&
          (event.event_type === "trade" && event.sides.length ? (
            <TradeComparison
              sides={event.sides}
              transactionId={event.transaction_id}
            />
          ) : (
            <div className="event-details">
              {event.details.map((detail, detailIndex) => (
                <span key={`${detail}-${detailIndex}`}>{detail}</span>
              ))}
              {event.transaction_id && (
                <small>Transaction ID: {event.transaction_id}</small>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
function TradeComparison({
  sides,
  transactionId,
}: {
  sides: PlayerEvent["sides"];
  transactionId: string | null;
}) {
  return (
    <div className="trade-comparison">
      <div className="trade-columns">
        {sides.map((side, index) => (
          <div className="trade-column" key={side.roster_id}>
            {index > 0 && (
              <span className="trade-swap" aria-hidden="true">
                ⇄
              </span>
            )}
            <header>
              <span>{side.manager_name}</span>
              <strong>Received</strong>
            </header>
            <div>
              {side.assets_received.length ? (
                side.assets_received.map((asset, assetIndex) => (
                  <span className="trade-asset" key={`${asset}-${assetIndex}`}>
                    {asset}
                  </span>
                ))
              ) : (
                <span className="trade-asset empty-asset">
                  No cataloged assets
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {transactionId && (
        <small className="trade-id">Transaction ID: {transactionId}</small>
      )}
    </div>
  );
}
