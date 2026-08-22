import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TEAM_COLORS, teamLabel } from "@/features/dashboard";
import { TradeComparison, type PickHistory } from "@/features/transactions";
import { getJson } from "@/services";
import type { DraftPick, Roster } from "../../types";
import { pickLabel } from "../../utils";
import type { DynastyAssetsProps } from "./types";

function DraftBoard({ rosters, championOwnerId }: { rosters: Roster[]; championOwnerId?: string | null }) {
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
            {teamLabel(team, championOwnerId)}
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
                      <strong>{teamLabel(owner, championOwnerId)}</strong>
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
export function DynastyAssets({
  picks,
  leagueId,
  catalog,
  rosters,
  championOwnerId,
}: DynastyAssetsProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<PickHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [panelAnimationParent] = useAutoAnimate<HTMLElement>();
  const [pickAnimationParent] = useAutoAnimate<HTMLDivElement>();
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
    <section
      ref={panelAnimationParent}
      className={`panel pick-panel ${
        selectedKey || boardOpen ? "expanded" : ""
      } ${boardOpen ? "board-expanded" : ""}`}
    >
      <span className="eyebrow">Dynasty assets</span>
      <h2>Draft picks</h2>
      <div className="pick-list" ref={pickAnimationParent}>
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
      <button
        type="button"
        className="draft-board-toggle"
        onClick={() => setBoardOpen((current) => !current)}
        aria-expanded={boardOpen}
      >
        <span>
          <strong>
            {boardOpen ? "Hide full draft board" : "View full draft board"}
          </strong>
          <small>
            Compare every team&apos;s current draft capital by year and round.
          </small>
        </span>
        <i aria-hidden="true">{boardOpen ? "−" : "+"}</i>
      </button>
      {boardOpen && (
        <div className="inline-draft-board">
          <DraftBoard rosters={rosters} championOwnerId={championOwnerId} />
        </div>
      )}
    </section>
  );
}
