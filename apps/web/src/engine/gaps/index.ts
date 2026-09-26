// Owner: Uthai. Authoritative rule 5 (docs/PHASE0_AUDIT.md section F / the
// architect brief): a gap starts suspected; it's confirmed only by a SECOND
// failure on the same topic + step; it's fixed only by a clean pass or a
// passed re-test on a fresh question. Assisted passes never confirm-fix a gap.

import type { Gap, GapType } from "../../contracts";

export interface GapOutcome {
  studentId: string;
  topicId: string;
  step: Gap["step"];
  type: GapType;
  passed: boolean;
  assisted: boolean;
  attemptId: string;
  isRetestOnFreshQuestion: boolean;
}

/**
 * Given the existing gaps for a student and one new step outcome, returns the
 * updated Gap[] (a new array; existing gaps not touched by this outcome are
 * returned unchanged by reference). Pure — no storage. The caller
 * (engine/session/submitStep) persists the result via the Repository.
 */
export function updateGaps(existingGaps: Gap[], outcome: GapOutcome): Gap[] {
  const now = new Date().toISOString();
  const existing = existingGaps.find(
    (g) => g.studentId === outcome.studentId && g.topicId === outcome.topicId && g.step === outcome.step,
  );

  if (outcome.passed) {
    if (!existing) return existingGaps; // nothing to fix
    // Rule 5: a cell (and its gap) only clears on a clean pass or a passed
    // re-test on a fresh question — never on an assisted pass.
    if (outcome.assisted && !outcome.isRetestOnFreshQuestion) return existingGaps;
    return existingGaps.map((g) =>
      g === existing
        ? { ...g, status: "fixed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: now }
        : g,
    );
  }

  if (!existing) {
    // First failure on this topic+step: suspected.
    const gap: Gap = {
      id: `gap_${outcome.studentId}_${outcome.topicId}_${outcome.step}`,
      studentId: outcome.studentId,
      topicId: outcome.topicId,
      step: outcome.step,
      type: outcome.type,
      status: "suspected",
      attemptIds: [outcome.attemptId],
      updatedAt: now,
    };
    return [...existingGaps, gap];
  }

  if (existing.status === "suspected") {
    // Second failure on the same topic+step: confirmed.
    return existingGaps.map((g) =>
      g === existing
        ? { ...g, status: "confirmed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: now }
        : g,
    );
  }

  // Already confirmed (or was fixed and has now regressed): record the
  // evidence, keep it confirmed.
  return existingGaps.map((g) =>
    g === existing
      ? { ...g, status: "confirmed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: now }
      : g,
  );
}
