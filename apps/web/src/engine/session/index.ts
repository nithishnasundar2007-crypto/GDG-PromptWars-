// Owner: Uthai. createStudent + startLadder + submitStep — the orchestrator.
// submitStep follows API Contract §3.3's order:
//
//   1. Load the ladder and question; reject if the ladder is finished or the
//      step cannot be graded (INVALID_STEP).
//   2. Apply/Transfer: the hidden tests are run by grading. gradeStep already
//      calls runCode itself for code steps and wraps the RunResult, so we
//      call it once instead of running the tests twice.
//   3. Grade the step (grading's gradeStep).
//   4. Save the Attempt, then call engine/ladder's nextStep.
//   5. Call engine/gaps' updateGaps: create/confirm/fix.
//   6. Recompute the changed Readiness cells and replan.
//   7. Return SubmitResult.
//
// This is the ONLY place engine and grading meet: it receives a typed
// GradeResult and never reaches into how it was produced
// (docs/PHASE0_AUDIT.md section F). Grading is injected via EngineDeps so the
// mocks (or real grading at M2) can be swapped without touching this file.

import type {
  AnyStep,
  Attempt,
  GradeResult,
  LadderState,
  Question,
  QuestionRole,
  Scope,
  Student,
  SubmitResult,
} from "../../contracts";
import { isoDate, nowOf, parseIsoDate, type EngineDeps, type GradeStepFn } from "../deps";
import { EngineError } from "../errors";
import {
  approachFor,
  findCompany,
  getQuestion,
  getTopic,
  pickQuestion,
  redactHiddenTests,
  targetTimeFor,
} from "../content";
import { isSlow, updateGaps, type GapOutcome } from "../gaps";
import {
  applyStepResult,
  attemptWasAssisted,
  columnOf,
  newLadder,
  nextStep,
  promptForStep,
  stepsFor,
} from "../ladder";
import { createPlannerModule } from "../planner";
import { deriveTopicCells } from "../readiness";
import type { Repository } from "../store";

const ROLES: readonly QuestionRole[] = ["probe", "confirm", "retest"];
const SCOPES: readonly Scope[] = ["sprint", "two-week"];

const defaultGradeStep: GradeStepFn = async (question, step, answer) => {
  const grading = await import("../../grading");
  return grading.gradeStep(question, step, answer);
};

// A ladder that is mid-grading cannot take a second submit (double click, retry race).
const inFlight = new Set<string>();

/** Whether the question has what grading needs for this step. */
export function stepSupported(question: Question, step: AnyStep): boolean {
  const hasRubric = (question.rubrics[step]?.length ?? 0) > 0;
  if (step === "apply") return question.lang ? (question.tests?.length ?? 0) > 0 : hasRubric;
  if (step === "transfer") {
    if (!question.variant) return false;
    return question.lang ? question.variant.tests.length > 0 : hasRubric;
  }
  return hasRubric;
}

export function createSessionModule(repo: Repository, deps: EngineDeps = {}) {
  const planner = createPlannerModule(repo, deps);
  const gradeStep = deps.gradeStep ?? defaultGradeStep;

  return {
    async createStudent(input: Omit<Student, "id">): Promise<Student> {
      if (typeof input.name !== "string" || input.name.trim() === "") {
        throw new EngineError("INVALID_STEP", "A student needs a name.");
      }
      if (!SCOPES.includes(input.scope)) throw new EngineError("INVALID_STEP", `Unknown scope "${String(input.scope)}".`);
      if (!findCompany(input.companyId, input.scope)) {
        throw new EngineError("NOT_FOUND", `Unknown company "${input.companyId}".`);
      }
      if (!Number.isFinite(input.hoursPerDay) || input.hoursPerDay <= 0 || input.hoursPerDay > 24) {
        throw new EngineError("INVALID_STEP", "Hours per day must be between 0 and 24.");
      }
      const drive = parseIsoDate(input.driveDate);
      if (!drive) throw new EngineError("INVALID_STEP", "Drive date must be a real date as YYYY-MM-DD.");
      if (input.driveDate < isoDate(nowOf(deps))) {
        throw new EngineError("INVALID_STEP", "Drive date is in the past.");
      }
      const student = await repo.createStudent({ ...input, name: input.name.trim() });
      await planner.replan(student.id);
      return student;
    },

    async startLadder(
      studentId: string,
      topicId: string,
      role: QuestionRole,
      step?: AnyStep,
    ): Promise<{ ladder: LadderState; question: Question }> {
      if (!ROLES.includes(role)) throw new EngineError("INVALID_STEP", `Unknown question role "${String(role)}".`);
      const student = await repo.getStudent(studentId);
      if (!student) throw new EngineError("NOT_FOUND", `Unknown student "${studentId}".`);
      const topic = getTopic(topicId);
      if (!topic) throw new EngineError("NOT_FOUND", `Unknown topic "${topicId}".`);

      const attempts = await repo.getAttempts(studentId);
      const picked = pickQuestion(topicId, role, new Set(attempts.map((a) => a.questionId)));
      if (!picked) throw new EngineError("NOT_FOUND", `There are no questions for "${topic.name}" yet.`);
      const { question } = picked;

      if (step !== undefined) {
        if (!stepsFor(topic.track).includes(step)) {
          throw new EngineError("INVALID_STEP", `"${step}" is not a step on the ${topic.track} ladder.`);
        }
        if (!stepSupported(question, step)) {
          throw new EngineError("INVALID_STEP", `This question has no "${step}" step.`);
        }
      }

      const ladder = newLadder({
        id: repo.nextId("ld"),
        studentId,
        questionId: question.id,
        track: topic.track,
        ...(step !== undefined ? { startStep: step } : {}),
        startedAt: nowOf(deps).toISOString(),
      });
      await repo.saveLadder(ladder);
      return { ladder, question: redactHiddenTests(question) };
    },

    async submitStep(ladderId: string, answer: string, timeMs: number): Promise<SubmitResult> {
      if (typeof answer !== "string") throw new EngineError("INVALID_STEP", "An answer must be text.");
      if (!Number.isFinite(timeMs) || timeMs < 0) throw new EngineError("INVALID_STEP", "Time taken must be a non-negative number.");

      // 1. Load and validate.
      const ladder = await repo.getLadder(ladderId);
      if (!ladder) throw new EngineError("NOT_FOUND", `Unknown ladder "${ladderId}".`);
      if (ladder.current === "done") throw new EngineError("INVALID_STEP", "This ladder is already complete.");
      const step = ladder.current;
      const question = getQuestion(ladder.questionId);
      if (!question) throw new EngineError("NOT_FOUND", `Unknown question "${ladder.questionId}".`);
      const topic = getTopic(question.topicId);
      if (!topic) throw new EngineError("NOT_FOUND", `Unknown topic "${question.topicId}".`);
      const student = await repo.getStudent(ladder.studentId);
      if (!student) throw new EngineError("NOT_FOUND", `Unknown student "${ladder.studentId}".`);
      if (!stepSupported(question, step)) {
        throw new EngineError("INVALID_STEP", `Question "${question.id}" cannot be graded at the "${step}" step.`);
      }
      if (inFlight.has(ladderId)) throw new EngineError("INVALID_STEP", "This step is already being graded.");

      inFlight.add(ladderId);
      try {
        // 2-3. Run hidden tests and grade (grading owns both).
        const grade: GradeResult = await gradeStep(question, step, answer);
        if (grade.step !== step) {
          throw new EngineError("CONTRACT_MISMATCH", `Graded "${grade.step}" but the ladder is on "${step}".`);
        }

        const [attemptsBefore, gapsBefore] = await Promise.all([
          repo.getAttempts(student.id),
          repo.getGaps(student.id),
        ]);

        // 4. Save the attempt, then move the ladder.
        const assisted = attemptWasAssisted(ladder, step);
        const attempt: Attempt = {
          id: repo.nextId("att"),
          studentId: student.id,
          questionId: question.id,
          ladderId,
          step,
          answer,
          grade,
          assisted,
          timeMs,
          createdAt: nowOf(deps).toISOString(),
        };
        await repo.saveAttempt(attempt);

        const next = nextStep(ladder, grade);
        const updatedLadder = applyStepResult(
          ladder,
          { step, passed: grade.passed, timeMs, attemptId: attempt.id },
          next,
        );
        await repo.saveLadder(updatedLadder);

        // 5. Gaps. A step that the table attaches a gap to (including a hinted
        // pass = Recall) is failure evidence; a clean pass is fixing evidence.
        const column = columnOf(step);
        const evidenceQuestionIds = new Set(
          gapsBefore
            .filter((g) => g.topicId === topic.id && g.step === column && g.status !== "fixed")
            .flatMap((g) => g.attemptIds)
            .map((id) => attemptsBefore.find((a) => a.id === id)?.questionId),
        );
        const outcome: GapOutcome = {
          studentId: student.id,
          topicId: topic.id,
          step,
          type: next.gap ?? "recall", // type is ignored on a clean pass
          passed: grade.passed && next.gap === undefined,
          assisted,
          attemptId: attempt.id,
          isRetestOnFreshQuestion: !evidenceQuestionIds.has(question.id),
          slow: grade.passed && !assisted && isSlow(timeMs, targetTimeFor(question, step), deps.slowFactor),
          at: attempt.createdAt,
        };
        // A failed Recognize has no gap yet: the table defers it to the Hint step.
        const deferred = !grade.passed && next.gap === undefined;
        const gapsAfter = deferred ? gapsBefore : updateGaps(gapsBefore, outcome);
        const gapsChanged = gapsAfter.filter((g) => !gapsBefore.includes(g));
        for (const gap of gapsChanged) await repo.upsertGap(gap);

        // 6. Readiness cells that moved, then replan.
        const before = deriveTopicCells(topic, attemptsBefore, gapsBefore);
        const after = deriveTopicCells(topic, [...attemptsBefore, attempt], gapsAfter);
        const cellsChanged = after.filter((cell, i) => JSON.stringify(cell) !== JSON.stringify(before[i]));
        try {
          await planner.replan(student.id);
        } catch (e) {
          // The plan is derived and rebuilt on the next read, so this must not undo a saved step.
          console.warn("replan failed after submitStep; it will be rebuilt on the next read", e);
        }

        // 7. Result.
        const nextQuestionText = promptForStep(question, updatedLadder.current);
        return {
          grade,
          ladder: updatedLadder,
          ...(nextQuestionText !== undefined ? { nextQuestionText } : {}),
          ...(step === "hint" && !grade.passed ? { revealedApproach: approachFor(question) } : {}),
          gapsChanged,
          cellsChanged,
        };
      } finally {
        inFlight.delete(ladderId);
      }
    },
  };
}
