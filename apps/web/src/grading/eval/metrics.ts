// PRD §8.4 — pure confusion-matrix math for the eval harness (Task 9). No
// I/O, no AI calls — just the metric definitions, so they're independently
// testable against a hand-computed example.

import type { ConfusionCounts } from "./types";

function safeRate(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

export function computeRates(c: ConfusionCounts): { agreementRate: number; falseAwardRate: number; falseRejectRate: number } {
  const total = c.truePositive + c.falsePositive + c.falseNegative + c.trueNegative;
  return {
    agreementRate: safeRate(c.truePositive + c.trueNegative, total),
    falseAwardRate: safeRate(c.falsePositive, c.falsePositive + c.trueNegative),
    falseRejectRate: safeRate(c.falseNegative, c.falseNegative + c.truePositive),
  };
}

export function emptyConfusion(): ConfusionCounts {
  return { truePositive: 0, falsePositive: 0, falseNegative: 0, trueNegative: 0 };
}

export function addPointResult(c: ConfusionCounts, systemMet: boolean, humanLabel: boolean): ConfusionCounts {
  if (systemMet && humanLabel) return { ...c, truePositive: c.truePositive + 1 };
  if (systemMet && !humanLabel) return { ...c, falsePositive: c.falsePositive + 1 };
  if (!systemMet && humanLabel) return { ...c, falseNegative: c.falseNegative + 1 };
  return { ...c, trueNegative: c.trueNegative + 1 };
}
