import { describe, expect, it } from "vitest";
import { matchQuote, normalise } from "./index";

describe("normalise", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalise("BFS visits nodes,  level-by-level!")).toBe("bfs visits nodes level by level");
  });
});

describe("matchQuote", () => {
  it("matches an exact quote", () => {
    const r = matchQuote("BFS visits nodes level by level", "Because BFS visits nodes level by level, it finds the shortest path.");
    expect(r.matched).toBe(true);
  });

  it("matches a tidied quote (punctuation/case differences only)", () => {
    const r = matchQuote(
      "bfs visits nodes level by level",
      "BFS visits nodes, level-by-level, since it's a queue based traversal.",
    );
    expect(r.similarity).toBeGreaterThanOrEqual(0.9);
  });

  it("rejects a span that isn't actually in the answer", () => {
    const r = matchQuote(
      "BFS guarantees the shortest path because it explores level by level",
      "I used DFS to solve this because it's simpler to code.",
    );
    expect(r.matched).toBe(false);
  });

  it("accepts small typo/filler-word noise within the fuzzy threshold", () => {
    const r = matchQuote(
      "the first time we reach the target is the shortest path",
      "so basically the first tim we reach the target is the shortest path fr fr",
    );
    expect(r.matched).toBe(true);
  });

  it("rejects noise heavy enough to change the actual content, even mid-quote", () => {
    // "the target" -> "da target" and "time" -> "tim", together with filler
    // words, push this below the threshold — the quote matcher should stay
    // strict rather than papering over substituted content words.
    const r = matchQuote(
      "the first time we reach the target is the shortest path",
      "so basically the first tim we reach da target is the shortest path fr fr",
    );
    expect(r.matched).toBe(false);
  });

  it("returns similarity 0 for an empty span", () => {
    expect(matchQuote("", "anything").matched).toBe(false);
  });
});
