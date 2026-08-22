import type { StatisticsDisplay } from "../../types";
import type { StatisticsControlsProps } from "./types";

export function StatisticsControls({
  leagueSeason,
  season,
  week,
  display,
  onSeasonChange,
  onWeekChange,
  onDisplayChange,
}: StatisticsControlsProps) {
  return (
    <div className="scoring-head">
      <div>
        <span className="eyebrow">League statistics</span>
        <h2>Player stat leaders</h2>
        <p>
          Explore fantasy-relevant production using this league&apos;s positions
          and scoring rules. Select any column to rank the league.
        </p>
      </div>
      <div className="scoring-controls">
        <label>
          Season
          <select
            value={season}
            onChange={(event) => onSeasonChange(Number(event.target.value))}
          >
            {Array.from(
              { length: 5 },
              (_, index) => Number(leagueSeason) - index
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
              onWeekChange(
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
            value={display}
            onChange={(event) =>
              onDisplayChange(event.target.value as StatisticsDisplay)
            }
          >
            <option value="total">Season totals</option>
            <option value="perGame">Per game</option>
          </select>
        </label>
      </div>
    </div>
  );
}
