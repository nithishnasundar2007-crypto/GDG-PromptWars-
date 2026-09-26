// Injectable dependencies so engine modules stay testable without the
// browser-only grading stack, and so mocks/real grading can be swapped at M2.

import type { AnyStep, GradeResult, Question } from "../contracts";

export type GradeStepFn = (question: Question, step: AnyStep, answer: string) => Promise<GradeResult>;

export interface EngineDeps {
  /** Grading entry point (Suchit's gradeStep). Defaults to the real one, loaded lazily. */
  gradeStep?: GradeStepFn;
  /** Clock, for plan dates and timestamps. Defaults to the system clock. */
  now?: () => Date;
  /** Speed-gap threshold as a multiple of targetTimeMs. Defaults to DEFAULT_SLOW_FACTOR (an assumption, not a PRD value). */
  slowFactor?: number;
}

export function nowOf(deps: EngineDeps): Date {
  return deps.now ? deps.now() : new Date();
}

/** Local calendar date as YYYY-MM-DD (the contract's date format). */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseIsoDate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isoDate(d) === s ? d : undefined;
}
