// Owner: Uthai. startLadder + submitStep — the orchestrator. submitStep MUST
// follow API Contract §3.3's order exactly:
//
//   1. Load the ladder and question; reject if the step is out of order
//      (INVALID_STEP).
//   2. Apply or Transfer: call grading's runCode with the hidden tests.
//   3. Call grading's gradeStep (code steps wrap the RunResult).
//   4. Save the Attempt, then call engine/ladder's nextStep.
//   5. Call engine/gaps' updateGaps: create/confirm/fix.
//   6. Recompute the changed Readiness cells and call engine/planner's replan.
//   7. Return SubmitResult.
//
// This function is the ONLY place engine and grading meet — it receives a
// typed GradeResult from grading/pipeline and never reaches into how it was
// produced (docs/PHASE0_AUDIT.md section F).

import type { AnyStep, LadderState, Question, QuestionRole, Student, SubmitResult } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import type { Repository } from "../store";

export function createSessionModule(_repo: Repository) {
  return {
    async createStudent(_input: Omit<Student, "id">): Promise<Student> {
      throw new NotImplementedError("createStudent", "Uthai", "M1");
    },
    async startLadder(
      _studentId: string,
      _topicId: string,
      _role: QuestionRole,
      _step?: AnyStep,
    ): Promise<{ ladder: LadderState; question: Question }> {
      throw new NotImplementedError("startLadder", "Uthai", "M1");
    },
    async submitStep(_ladderId: string, _answer: string, _timeMs: number): Promise<SubmitResult> {
      throw new NotImplementedError("submitStep", "Uthai", "M1");
    },
  };
}
