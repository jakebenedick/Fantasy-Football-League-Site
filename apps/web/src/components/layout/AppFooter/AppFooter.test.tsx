import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppFooter } from "./AppFooter";

describe("AppFooter", () => {
  it("links to the privacy and data-use disclosure", () => {
    render(<AppFooter />);
    expect(screen.getByRole("link", { name: "Privacy & data use" })).toHaveAttribute("href", "/privacy");
  });
});
