import { Icon } from "@/components/ui/Icon";
import type { RosterStatus } from "../../types";
import type { StatisticsFiltersProps } from "./types";

export function StatisticsFilters({
  search,
  position,
  rosterStatus,
  eligiblePositions,
  playerCount,
  onSearchChange,
  onPositionChange,
  onRosterStatusChange,
}: StatisticsFiltersProps) {
  return (
    <div className="leader-toolbar">
      <div className="leader-search">
        <Icon name="search" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search players, positions, or managers"
          aria-label="Search stat leaders"
        />
      </div>
      <div className="position-filters" aria-label="Filter by position">
        {["ALL", ...eligiblePositions].map((value) => (
          <button
            key={value}
            className={position === value ? "active" : ""}
            onClick={() => onPositionChange(value)}
            aria-pressed={position === value}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="ownership-filter" aria-label="Filter by roster status">
        {(["all", "rostered", "available"] as RosterStatus[]).map(
          (value) => (
            <button
              key={value}
              className={rosterStatus === value ? "active" : ""}
              onClick={() => onRosterStatusChange(value)}
              aria-pressed={rosterStatus === value}
            >
              {value === "all"
                ? "All players"
                : value === "rostered"
                ? "Rostered"
                : "Available"}
            </button>
          )
        )}
      </div>
      <span className="leader-count">{playerCount} players</span>
    </div>
  );
}
