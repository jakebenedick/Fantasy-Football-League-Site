import { pickLabel } from "../../utils";
import type { OpponentHistoryPanelsProps } from "./types";

export function OpponentHistoryPanels({
  history,
  loading,
  catalog,
}: OpponentHistoryPanelsProps) {
  return (
    <>
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
                        {history.player_names[id] ?? catalog[id]?.full_name ?? `Player ${id}`}
                      </small>
                    ))}
                    {side.draft_picks_received.map((pick, index) => (
                      <small key={`${pick.season}-${pick.round}-${index}`}>
                        {pickLabel(pick)} · originally{" "}
                        {pick.original_owner_name ?? `Team ${pick.original_roster_id}`}
                      </small>
                    ))}
                    {!side.player_ids_received.length &&
                      !side.draft_picks_received.length && <small>No cataloged assets</small>}
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <p className="loading-copy">No completed trades found between these managers.</p>
        )}
      </section>
    </>
  );
}
