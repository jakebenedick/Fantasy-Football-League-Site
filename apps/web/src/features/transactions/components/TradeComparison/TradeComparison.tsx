import type { TradeComparisonProps } from "./types";

export function TradeComparison({ sides, transactionId }: TradeComparisonProps) {
  return (
    <div className="trade-comparison">
      <div className="trade-columns">
        {sides.map((side, index) => (
          <div className="trade-column" key={side.roster_id}>
            {index > 0 && <span className="trade-swap" aria-hidden="true">⇄</span>}
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
                <span className="trade-asset empty-asset">No cataloged assets</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {transactionId && <small className="trade-id">Transaction ID: {transactionId}</small>}
    </div>
  );
}
