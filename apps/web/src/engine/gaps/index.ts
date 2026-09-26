// Owner: Uthai. Authoritative gap rules (docs/PHASE0_AUDIT.md section F):
//
//   - a gap starts `suspected` on the first failure of a topic + step;
//   - a SECOND failure on the same topic + step + type makes it `confirmed`;
//   - it becomes `fixed` only by an unassisted pass on a FRESH question (a
//     re-test), never by finishing a drill and never by an assisted pass;
//   - a fixed gap that fails again goes straight back to `confirmed`.
//
// The contract's GapStatus has no "assisted" value, so an assisted pass is
// kept distinguishable through Attempt.assisted / StepOutcome.assisted and
// simply never advances a gap toward `fixed`.
//
// Gap TYPES come from the ladder's transition table (engine/ladder), which
// classifies by the step that failed; Speed comes from timing (see isSlow).

import type { AnyStep, Gap, GapType } from "../../contracts";
import { columnOf } from "../ladder";

/**
 * IMPLEMENTATION ASSUMPTION, not a PRD rule: the PRD/API Contract available in
 * this repo define Speed only as "correct but takes too long" and give no
 * threshold. A correct, unassisted answer slower than this multiple of the
 * question's targetTimeMs counts as slow. Override per engine via
 * EngineDeps.slowFactor once the PRD value is confirmed.
 */
export const DEFAULT_SLOW_FACTOR = 1.5;

export interface GapOutcome {
  studentId: string;
  topicId: string;
  step: AnyStep;
  /** Gap type recorded when `passed` is false (ignored on a pass). */
  type: GapType;
  passed: boolean;
  assisted: boolean;
  attemptId: string;
  /** True when this question is not among the evidence of any open gap on this topic + step. */
  isRetestOnFreshQuestion: boolean;
  /** A correct, unassisted answer that took longer than the slow factor x the target time. */
  slow?: boolean;
  /** ISO timestamp for updatedAt; defaults to now. */
  at?: string;
}

export function isSlow(timeMs: number, targetMs: number | undefined, factor = DEFAULT_SLOW_FACTOR): boolean {
  return targetMs !== undefined && timeMs > targetMs * factor;
}

export function gapIdFor(studentId: string, topicId: string, step: AnyStep, type: GapType): string {
  return `gap_${studentId}_${topicId}_${columnOf(step)}_${type}`;
}

/**
 * Given the student's existing gaps and one new step outcome, returns the
 * updated Gap[]. Pure: no storage. Gaps not touched by the outcome are
 * returned by reference, so callers can find what changed with `!existing.includes(g)`.
 */
export function updateGaps(existingGaps: Gap[], outcome: GapOutcome): Gap[] {
  const step = columnOf(outcome.step);
  const at = outcome.at ?? new Date().toISOString();
  const onCell = (g: Gap) =>
    g.studentId === outcome.studentId && g.topicId === outcome.topicId && g.step === step;

  if (!outcome.passed) {
    const existing = existingGaps.find((g) => onCell(g) && g.type === outcome.type);
    if (!existing) {
      const gap: Gap = {
        id: gapIdFor(outcome.studentId, outcome.topicId, step, outcome.type),
        studentId: outcome.studentId,
        topicId: outcome.topicId,
        step,
        type: outcome.type,
        status: "suspected",
        attemptIds: [outcome.attemptId],
        updatedAt: at,
      };
      return [...existingGaps, gap];
    }
    // suspected -> confirmed on the second failure; confirmed stays confirmed;
    // fixed -> confirmed (regressed).
    return existingGaps.map((g) =>
      g === existing
        ? { ...g, status: "confirmed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: at }
        : g,
    );
  }

  // Assisted passes are not independent proof: they change nothing.
  if (outcome.assisted) return existingGaps;

  let gaps = existingGaps;

  if (outcome.isRetestOnFreshQuestion) {
    const isOpenSkillGap = (g: Gap) => onCell(g) && g.status !== "fixed" && g.type !== "speed";
    const isOpenSpeedGap = (g: Gap) => onCell(g) && g.status !== "fixed" && g.type === "speed";
    gaps = gaps.map((g) =>
      isOpenSkillGap(g) || (!outcome.slow && isOpenSpeedGap(g))
        ? { ...g, status: "fixed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: at }
        : g,
    );
  }

  if (outcome.slow) {
    const speed = gaps.find((g) => onCell(g) && g.type === "speed");
    if (!speed) {
      gaps = [
        ...gaps,
        {
          id: gapIdFor(outcome.studentId, outcome.topicId, step, "speed"),
          studentId: outcome.studentId,
          topicId: outcome.topicId,
          step,
          type: "speed",
          status: "suspected",
          attemptIds: [outcome.attemptId],
          updatedAt: at,
        },
      ];
    } else {
      gaps = gaps.map((g) =>
        g === speed
          ? { ...g, status: "confirmed", attemptIds: [...g.attemptIds, outcome.attemptId], updatedAt: at }
          : g,
      );
    }
  }

  return gaps;
}
