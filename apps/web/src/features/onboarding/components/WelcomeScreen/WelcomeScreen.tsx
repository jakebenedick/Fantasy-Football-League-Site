import { Icon } from "../../../../components/ui/Icon";
import type { WelcomeScreenProps } from "./types";

export function WelcomeScreen({
  username,
  season,
  loading,
  error,
  onUsernameChange,
  onSeasonChange,
  onSubmit,
}: WelcomeScreenProps) {
  const currentYear = new Date().getFullYear();

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
      <form className="connect-card" onSubmit={onSubmit}>
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
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="e.g. gridiron_guru"
            />
          </div>
        </label>
        <label>
          Season
          <select
            value={season}
            onChange={(event) => onSeasonChange(Number(event.target.value))}
          >
            {[0, 1, 2, 3].map((offset) => (
              <option key={offset} value={currentYear - offset}>
                {currentYear - offset}
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
