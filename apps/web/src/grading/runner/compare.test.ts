// PRD §7.5 — output comparison unit tests.

import { describe, expect, it } from "vitest";
import { outputsMatch } from "./compare";

describe("outputsMatch", () => {
  it("matches identical strings", () => {
    expect(outputsMatch("4", "4")).toBe(true);
  });

  it("ignores trailing whitespace/newlines only", () => {
    expect(outputsMatch("4\n", "4")).toBe(true);
    expect(outputsMatch("4", "4\n\n")).toBe(true);
  });

  it("does not ignore a real content difference", () => {
    expect(outputsMatch("5", "4")).toBe(false);
  });

  it("does not ignore leading whitespace or internal spacing", () => {
    expect(outputsMatch(" 4", "4")).toBe(false);
    expect(outputsMatch("4 4", "44")).toBe(false);
  });
});
