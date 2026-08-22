import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import { TradeComparison } from "../TradeComparison";
import type { PlayerHistoryEventProps } from "./types";

export function PlayerHistoryEvent({ event, index }: PlayerHistoryEventProps) {
  const [open, setOpen] = useState(false);
  const [animationParent] = useAutoAnimate<HTMLDivElement>();
  const hasDetails = event.sides.length > 0 || event.details.length > 0;

  return (
    <div className="player-event">
      <i>{index + 1}</i>
      <div ref={animationParent}>
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
            <TradeComparison sides={event.sides} transactionId={event.transaction_id} />
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
