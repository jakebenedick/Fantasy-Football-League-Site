import { Icon } from "../../../../components/ui/Icon";
import { LEAGUE_SETUP_STEPS } from "../../constants";
import type { LeaguePickerProps } from "./types";

export function LeaguePicker({
  username,
  season,
  leagues,
  loading,
  error,
  onSelect,
  onBack,
}: LeaguePickerProps) {
  return (
    <section className="league-loader league-selector-loader">
      <div className="loader-visual" aria-hidden="true">
        <span className="loader-orbit loader-orbit-one" />
        <span className="loader-orbit loader-orbit-two" />
        <span className="loader-ball">🏈</span>
      </div>
      <div className="loader-copy">
        <button className="back loader-back" onClick={onBack}>
          ← Use another account
        </button>
        <span className="kicker">Setting up Fourth Down</span>
        <h1>Choose your league</h1>
        <p>
          {username} · {season} season · {leagues.length}{" "}
          {leagues.length === 1 ? "league" : "leagues"} found
        </p>
        <div className="loader-progress" aria-hidden="true">
          <span style={{ width: `${(1 / LEAGUE_SETUP_STEPS.length) * 100}%` }} />
        </div>
        <ol className="loader-steps selector-steps" aria-label="League setup progress">
          <li className="active setup-selection-step">
            <span className="loader-step-mark">01</span>
            <div className="setup-selection-content">
              <strong>{LEAGUE_SETUP_STEPS[0].title}</strong>
              <small>{LEAGUE_SETUP_STEPS[0].detail}</small>
              {error && (
                <div className="alert selector-alert" role="alert">
                  {error}
                </div>
              )}
              {!leagues.length ? (
                <div className="selector-empty">
                  <span>No leagues were found for this season.</span>
                  <button className="secondary" onClick={onBack}>
                    Try another account
                  </button>
                </div>
              ) : (
                <div className="league-choice-list">
                  {leagues.map((league) => (
                    <button
                      className="league-choice"
                      disabled={loading}
                      key={league.league_id}
                      onClick={() => onSelect(league)}
                    >
                      <span className="league-choice-status" aria-hidden="true" />
                      <span className="league-choice-copy">
                        <strong>{league.name}</strong>
                        <small>
                          {league.total_rosters} teams ·{" "}
                          {league.roster_positions.filter((slot) => slot !== "BN").length}{" "}
                          starting slots
                        </small>
                      </span>
                      <span className="league-choice-arrow">
                        <Icon name="arrow" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
          {LEAGUE_SETUP_STEPS.slice(1).map((step, index) => (
            <li className="waiting" key={step.title}>
              <span className="loader-step-mark">
                {String(index + 2).padStart(2, "0")}
              </span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
