import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TradeComparison } from "./TradeComparison";

describe("TradeComparison", () => {
  it("shows each side once using received assets", () => {
    render(
      <TradeComparison
        sides={[
          { roster_id: 1, manager_name: "Jake", assets_received: ["Ladd McConkey"] },
          { roster_id: 2, manager_name: "Pat", assets_received: ["Marvin Harrison Jr."] },
        ]}
        transactionId="trade-1"
      />
    );

    expect(screen.getAllByText("Received")).toHaveLength(2);
    expect(screen.getByText("Ladd McConkey")).toBeInTheDocument();
    expect(screen.getByText("Marvin Harrison Jr.")).toBeInTheDocument();
  });
});
