/* eslint-disable @next/next/no-img-element -- Sleeper team avatars are CDN-sized. */
import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { LeagueHistory } from "../../types";
import { colorFor, ordinal } from "../../utils";
import type { LeagueHistoryViewProps } from "./types";

export function LeagueHistoryView({
  history,
  loading,
}: LeagueHistoryViewProps) {
  const [open, setOpen] = useState(false);
  const [animationParent] = useAutoAnimate<HTMLElement>();
  return (
    <section className="history-archive" ref={animationParent}>
      <button
        type="button"
        className="archive-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <small>Dynasty archive</small>
          <strong>League history</strong>
          <em>Final placements, playoff brackets, and franchise trends.</em>
        </span>
        <i aria-hidden="true">{open ? "−" : "+"}</i>
      </button>
      {open && (
        <div className="archive-expanded">
          {loading ? (
            <div className="empty archive-loading">
              <span className="spinner dark" />
              <h2>Loading league history…</h2>
            </div>
          ) : (
            <>
              {history && <FinishTrends history={history} />}
              {history?.seasons.map((season) => (
                <HistorySeason key={season.league_id} season={season} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
function HistorySeason({
  season,
}: {
  season: LeagueHistory["seasons"][number];
}) {
  const [sort, setSort] = useState<"finish" | "record" | "points">("finish");
  const [open, setOpen] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);
  const [animationParent] = useAutoAnimate<HTMLElement>();
  const teams = [...season.teams].sort((a, b) =>
    sort === "points"
      ? b.points - a.points
      : sort === "record"
      ? b.wins - a.wins || b.points - a.points
      : (a.finish_position ?? 999) - (b.finish_position ?? 999)
  );
  return (
    <section className="panel season-table" ref={animationParent}>
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
