// Owner: Uthai. getReadinessMap and getCellEvidence — always DERIVED from
// Attempt[] + Gap[] via the Repository, never stored as a score (PRD F5 /
// docs/PHASE0_AUDIT.md section H). Column count: 4 technical columns
// (hint folds into recognize) per the flagged conflict in
// docs/PHASE0_AUDIT.md section I — confirm with the team before changing.
//
// Cell rule (evidence, not percentages):
//   red    a confirmed gap is open on this topic + column
//   amber  a suspected gap is open, OR the only evidence is a fail without a
//          gap yet / an assisted pass (not independent proof)
//   green  no open gap and the latest attempt is an unassisted pass
//   grey   no attempts

import type {
  AnyStep,
  Attempt,
  CellEvidence,
  CellState,
  Gap,
  HrStepId,
  ReadinessCell,
  ReadinessMap,
  ReadinessRow,
  StepId,
  Student,
  Topic,
} from "../../contracts";
import { EngineError } from "../errors";
import { findCompany, getQuestion, getTopic, redactHiddenTests, topicWeights } from "../content";
import { columnOf } from "../ladder";
import type { Repository } from "../store";

export const TECHNICAL_COLUMNS = ["recognize", "apply", "explain", "transfer"] as const;
export const HR_COLUMNS = ["structure", "specifics", "followup"] as const;

type TechnicalColumn = Exclude<StepId, "hint">;

function columnsFor(topic: Topic): readonly AnyStep[] {
  return topic.track === "hr" ? HR_COLUMNS : TECHNICAL_COLUMNS;
}

/** One cell, derived from the student's attempts and gaps. Pure. */
export function deriveCell(topic: Topic, column: AnyStep, attempts: Attempt[], gaps: Gap[]): ReadinessCell {
  const cellAttempts = attempts.filter(
    (a) => getQuestion(a.questionId)?.topicId === topic.id && columnOf(a.step) === column,
  );
  const openGaps = gaps.filter(
    (g) => g.topicId === topic.id && columnOf(g.step) === column && g.status !== "fixed",
  );

  let state: CellState;
  if (openGaps.some((g) => g.status === "confirmed")) state = "red";
  else if (openGaps.some((g) => g.status === "suspected")) state = "amber";
  else if (cellAttempts.length === 0) state = "grey";
  else {
    const latest = cellAttempts[cellAttempts.length - 1]!;
    state = latest.grade.passed && !latest.assisted ? "green" : "amber";
  }
  return { topicId: topic.id, step: column, state, attemptIds: cellAttempts.map((a) => a.id) };
}

export function deriveTopicCells(topic: Topic, attempts: Attempt[], gaps: Gap[]): ReadinessCell[] {
  return columnsFor(topic).map((col) => deriveCell(topic, col, attempts, gaps));
}

export function buildReadinessMap(student: Student, attempts: Attempt[], gaps: Gap[]): ReadinessMap {
  const company = findCompany(student.companyId, student.scope);
  if (!company) throw new EngineError("NOT_FOUND", `Unknown company "${student.companyId}".`);
  const weights = topicWeights(company);

  const technical: ReadinessRow<TechnicalColumn>[] = [];
  const hr: ReadinessRow<HrStepId>[] = [];
  for (const [topicId, weight] of weights) {
    const topic = getTopic(topicId);
    if (!topic) continue;
    const cells = deriveTopicCells(topic, attempts, gaps);
    if (topic.track === "hr") {
      hr.push({
        topic,
        weight,
        cells: Object.fromEntries(cells.map((c) => [c.step, c])) as Record<HrStepId, ReadinessCell>,
      });
    } else {
      technical.push({
        topic,
        weight,
        cells: Object.fromEntries(cells.map((c) => [c.step, c])) as Record<TechnicalColumn, ReadinessCell>,
      });
    }
  }
  return { companyId: company.id, technical, hr };
}

// TODO(contract decision, frontend + backend): a gap created by saveDebrief has no Attempt, so
// CellEvidence cannot show why its cell is amber/red. Needs a CellEvidence change; do not fake attempts.
export function createReadinessModule(repo: Repository) {
  async function requireStudent(studentId: string): Promise<Student> {
    const student = await repo.getStudent(studentId);
    if (!student) throw new EngineError("NOT_FOUND", `Unknown student "${studentId}".`);
    return student;
  }

  return {
    async getReadinessMap(studentId: string): Promise<ReadinessMap> {
      const student = await requireStudent(studentId);
      const [attempts, gaps] = await Promise.all([repo.getAttempts(studentId), repo.getGaps(studentId)]);
      return buildReadinessMap(student, attempts, gaps);
    },

    async getCellEvidence(studentId: string, topicId: string, step: AnyStep): Promise<CellEvidence> {
      await requireStudent(studentId);
      const topic = getTopic(topicId);
      if (!topic) throw new EngineError("NOT_FOUND", `Unknown topic "${topicId}".`);
      const column = columnOf(step);
      if (!columnsFor(topic).includes(column)) {
        throw new EngineError("INVALID_STEP", `"${step}" is not a readiness column for a ${topic.track} topic.`);
      }
      const [attempts, gaps] = await Promise.all([repo.getAttempts(studentId), repo.getGaps(studentId)]);
      const cell = deriveCell(topic, column, attempts, gaps);
      const byId = new Map(attempts.map((a) => [a.id, a]));
      const evidence = cell.attemptIds.flatMap((id) => {
        const attempt = byId.get(id);
        const question = attempt && getQuestion(attempt.questionId);
        return attempt && question ? [{ ...attempt, question: redactHiddenTests(question) }] : [];
      });
      return { cell, attempts: evidence };
    },
  };
}
