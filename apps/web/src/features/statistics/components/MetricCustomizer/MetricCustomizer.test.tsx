import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MetricCustomizer } from "./MetricCustomizer";

const metrics = [
  { key: "pass_yd", label: "Pass yds", category: "Production", format: "number" },
  { key: "pass_att", label: "Attempts", category: "Opportunity", format: "number" },
];

describe("MetricCustomizer", () => {
  it("uses recommended metrics as the checkbox baseline", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MetricCustomizer
        availableMetrics={metrics}
        defaultMetrics={[metrics[0]]}
        selectedMetricKeys={[]}
        onSelectedMetricKeysChange={onChange}
      />
    );

    expect(screen.getByLabelText(/Pass yds/)).toBeChecked();
    expect(screen.getByLabelText(/Attempts/)).not.toBeChecked();
    await user.click(screen.getByLabelText(/Attempts/));
    expect(onChange).toHaveBeenCalledWith(["pass_yd", "pass_att"]);
  });
});
