// Shared by engine tests only. A scripted stand-in for grading's gradeStep:
// an answer containing "PASS" passes the step, anything else fails it. This
// is the same job the mocks do until the real runCode/gradeStep land at M2.

import type { AnyStep, GradeResult, Question, Student } from "../contracts";
import type { EngineDeps, GradeStepFn } from "./deps";
import { createDebriefModule } from "./debrief";
import { createDrillsModule } from "./drills";
import { createPlannerModule } from "./planner";
import { createReadinessModule } from "./readiness";
import { createSessionModule } from "./session";
import { InMemoryRepository } from "./store";

/** 2026-09-26, local time. */
export const NOW = () => new Date(2026, 8, 26, 9, 0, 0);

export const fakeGrade: GradeStepFn = async (question: Question, step: AnyStep, answer: string): Promise<GradeResult> => {
  const passed = answer.includes("PASS");
  const feedback = passed
    ? undefined
    : { whatHappened: "It failed.", whyWrong: "Because.", missing: "Something.", nextDrill: "A drill." };
  if ((step === "apply" || step === "transfer") && question.lang) {
    const failure = { testId: "t2", passed: false, timedOut: false, input: "in", expected: "1", actual: "2" };
    return {
      step,
      passed,
      run: {
        passed,
        results: passed ? [{ testId: "t2", passed: true, timedOut: false }] : [failure],
        runtimeMs: 10,
        ...(passed ? {} : { firstFailure: failure }),
      },
      ...(feedback !== undefined ? { feedback } : {}),
    };
  }
  const points = question.rubrics[step] ?? [];
  return {
    step,
    passed,
    rubric: points.map((p) => ({
      pointId: p.id,
      spans: passed ? ["a quote"] : [],
      quoteMatched: passed,
      verifierYes: passed,
      met: passed,
    })),
    ...(feedback !== undefined ? { feedback } : {}),
  };
};

export async function setup(overrides: Partial<Omit<Student, "id">> = {}, extraDeps: EngineDeps = {}) {
  const repo = new InMemoryRepository();
  const deps: EngineDeps = { gradeStep: fakeGrade, now: NOW, ...extraDeps };
  const session = createSessionModule(repo, deps);
  const planner = createPlannerModule(repo, deps);
  const readiness = createReadinessModule(repo);
  const drills = createDrillsModule(repo);
  const debrief = createDebriefModule(repo, deps);
  const student = await session.createStudent({
    name: "Asha",
    companyId: "co_zoho",
    driveDate: "2026-10-03",
    hoursPerDay: 3,
    scope: "sprint",
    ...overrides,
  });
  return { repo, deps, session, planner, readiness, drills, debrief, student };
}

export type Harness = Awaited<ReturnType<typeof setup>>;

/** Starts a ladder and submits each answer in turn, returning every SubmitResult. */
export async function runLadder(
  h: Harness,
  topicId: string,
  role: "probe" | "confirm" | "retest",
  answers: string[],
  startStep?: AnyStep,
  timeMs = 30_000,
) {
  const { ladder, question } = await h.session.startLadder(h.student.id, topicId, role, startStep);
  const results = [];
  for (const answer of answers) results.push(await h.session.submitStep(ladder.id, answer, timeMs));
  return { ladder, question, results };
}
