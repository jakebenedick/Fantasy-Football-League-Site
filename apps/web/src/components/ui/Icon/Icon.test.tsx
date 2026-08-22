import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders a decorative SVG for the requested icon", () => {
    const { container } = render(<Icon name="search" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("circle")).toBeInTheDocument();
  });
});
