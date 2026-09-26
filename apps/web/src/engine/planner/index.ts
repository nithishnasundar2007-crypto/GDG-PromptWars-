// Owner: Uthai. The next-task rule (PRD 7.3), stated as data-driven priority,
// not invented scores: (1) confirmed gaps first, by topic weight, lowest
// failed step, drill time; (2) suspected gaps get one confirmation probe;
// (3) untested high-weight topics get a first probe; (4) repeat until the
// day's time budget is used. Authoritative rule — never delegated to the LLM.
//
// The plan is DERIVED: replan() rebuilds every not-yet-done task from the
// student's current gaps and attempts, and keeps done/skipped items as
// history. Task ids are deterministic (kind + gap + gap evidence count), so
// a task keeps its id across replans and a failed re-test (one more piece of
// evidence on the gap) produces a fresh drill + re-test rather than reusing
// the completed ones.

import type { AnyStep, Company, Gap, Plan, PlanItem, Student } from "../../contracts";
import { isoDate, nowOf, parseIsoDate, type EngineDeps } from "../deps";
import { EngineError } from "../errors";
import { findCompany, getQuestion, getTopic, hasLadderQuestions, topicWeights } from "../content";
import { buildDrill } from "../drills";
import { columnOf } from "../ladder";
import type { Repository } from "../store";

export const PROBE_MINUTES = 20;
export const CONFIRM_MINUTES = 15;
export const RETEST_MINUTES = 15;
export const MOCK_MINUTES = 30;
const MAX_PLAN_DAYS = 120;

const STEP_ORDER: AnyStep[] = ["recognize", "apply", "explain", "transfer", "structure", "specifics", "followup"];
const stepRank = (s: AnyStep) => STEP_ORDER.indexOf(columnOf(s));

type Task = Omit<PlanItem, "date" | "status">;

const baseId = (id: string) => id.replace(/~\d+$/, "");

function drillMinutes(gap: Gap): number {
  try {
    return buildDrill(gap).minutes;
  } catch {
    return 15;
  }
}

/** The prioritised queue of tasks still to do. Pure. */
export function buildTasks(company: Company, gaps: Gap[], attemptedTopicIds: Set<string>): Task[] {
  const weights = topicWeights(company);
  const weightOf = (topicId: string) => weights.get(topicId) ?? 1;
  const inCompany = (g: Gap) => weights.has(g.topicId);
  const tasks: Task[] = [];

  // 1. Confirmed gaps: topic weight, then lowest failed step, then shortest drill.
  const confirmed = gaps
    .filter((g) => g.status === "confirmed" && inCompany(g))
    .sort(
      (a, b) =>
        weightOf(b.topicId) - weightOf(a.topicId) ||
        stepRank(a.step) - stepRank(b.step) ||
        drillMinutes(a) - drillMinutes(b) ||
        a.id.localeCompare(b.id),
    );
  for (const gap of confirmed) {
    const version = `${gap.id}_v${gap.attemptIds.length}`;
    tasks.push({
      id: `pi_drill_${version}`,
      topicId: gap.topicId,
      kind: "drill",
      step: gap.step,
      gapId: gap.id,
      gapType: gap.type,
      minutes: drillMinutes(gap),
    });
    if (hasLadderQuestions(gap.topicId)) {
      tasks.push({
        id: `pi_retest_${version}`,
        topicId: gap.topicId,
        kind: "retest",
        step: gap.step,
        gapId: gap.id,
        gapType: gap.type,
        minutes: RETEST_MINUTES,
      });
    }
  }

  // 2. Suspected gaps: one confirmation probe each.
  const suspected = gaps
    .filter((g) => g.status === "suspected" && inCompany(g) && hasLadderQuestions(g.topicId))
    .sort(
      (a, b) =>
        weightOf(b.topicId) - weightOf(a.topicId) || stepRank(a.step) - stepRank(b.step) || a.id.localeCompare(b.id),
    );
  for (const gap of suspected) {
    tasks.push({
      id: `pi_confirm_${gap.id}_v${gap.attemptIds.length}`,
      topicId: gap.topicId,
      kind: "confirm",
      step: gap.step,
      gapId: gap.id,
      gapType: gap.type,
      minutes: CONFIRM_MINUTES,
    });
  }

  // 3. Untested topics, highest weight first (ties keep round order).
  const untested = [...weights.keys()]
    .filter((id) => !attemptedTopicIds.has(id) && !gaps.some((g) => g.topicId === id) && hasLadderQuestions(id))
    .sort((a, b) => weightOf(b) - weightOf(a));
  for (const topicId of untested) {
    tasks.push({ id: `pi_probe_${topicId}`, topicId, kind: "probe", minutes: PROBE_MINUTES });
  }

  return tasks;
}

function datesBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (d <= end && dates.length < MAX_PLAN_DAYS) {
    dates.push(isoDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates.length ? dates : [isoDate(start)];
}

export function createPlannerModule(repo: Repository, deps: EngineDeps = {}) {
  async function requireStudent(studentId: string): Promise<Student> {
    const student = await repo.getStudent(studentId);
    if (!student) throw new EngineError("NOT_FOUND", `Unknown student "${studentId}".`);
    return student;
  }

  async function replan(studentId: string): Promise<Plan> {
    const student = await requireStudent(studentId);
    const company = findCompany(student.companyId, student.scope);
    if (!company) throw new EngineError("NOT_FOUND", `Unknown company "${student.companyId}".`);

    const [attempts, gaps, previous] = await Promise.all([
      repo.getAttempts(studentId),
      repo.getGaps(studentId),
      repo.getPlan(studentId),
    ]);

    const history: { date: string; item: PlanItem }[] = [];
    for (const day of previous?.days ?? []) {
      for (const item of day.items) if (item.status !== "todo") history.push({ date: day.date, item });
    }
    const doneBases = new Set(history.filter((h) => h.item.status === "done").map((h) => baseId(h.item.id)));
    const skippedCount = new Map<string, number>();
    for (const h of history) {
      if (h.item.status === "skipped") {
        const b = baseId(h.item.id);
        skippedCount.set(b, (skippedCount.get(b) ?? 0) + 1);
      }
    }

    const attemptedTopicIds = new Set(
      attempts.map((a) => getQuestion(a.questionId)?.topicId).filter((t): t is string => t !== undefined),
    );
    const queue = buildTasks(company, gaps, attemptedTopicIds).filter((t) => !doneBases.has(t.id));
    // Skipped tasks are not dropped (the gap is still open): they go to the back with a new id.
    const fresh = queue.filter((t) => !skippedCount.has(t.id));
    const deferred = queue
      .filter((t) => skippedCount.has(t.id))
      .map((t) => ({ ...t, id: `${t.id}~${skippedCount.get(t.id)}` }));
    const ordered = [...fresh, ...deferred];

    const now = nowOf(deps);
    const drive = parseIsoDate(student.driveDate);
    const end = drive && drive > now ? drive : now;
    const dates = datesBetween(now, end);
    const budget = Math.max(1, Math.round(student.hoursPerDay * 60));

    const byDate = new Map<string, PlanItem[]>();
    const used = new Map<string, number>();
    for (const h of history) {
      byDate.set(h.date, [...(byDate.get(h.date) ?? []), h.item]);
      if (h.item.status === "done") used.set(h.date, (used.get(h.date) ?? 0) + h.item.minutes);
    }

    let dayIdx = 0;
    for (const task of ordered) {
      while (dayIdx < dates.length) {
        const date = dates[dayIdx]!;
        const spent = used.get(date) ?? 0;
        if (spent === 0 || spent + task.minutes <= budget) break;
        dayIdx += 1;
      }
      if (dayIdx >= dates.length) break; // out of days: lower-priority work waits for the next replan
      const date = dates[dayIdx]!;
      used.set(date, (used.get(date) ?? 0) + task.minutes);
      byDate.set(date, [...(byDate.get(date) ?? []), { ...task, date, status: "todo" }]);
    }

    // Nothing left to fix or probe: keep the remaining days useful with one mock round a day.
    if (ordered.length === 0) {
      const mockTopics = [...topicWeights(company)]
        .filter(([id]) => hasLadderQuestions(id) && getTopic(id))
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      dates.forEach((date, i) => {
        const topicId = mockTopics[i % Math.max(1, mockTopics.length)];
        const spent = used.get(date) ?? 0;
        if (!topicId || (spent > 0 && spent + MOCK_MINUTES > budget)) return;
        const id = `pi_mock_${date}`;
        if (doneBases.has(id) || (byDate.get(date) ?? []).some((x) => baseId(x.id) === id)) return;
        used.set(date, (used.get(date) ?? 0) + MOCK_MINUTES);
        byDate.set(date, [
          ...(byDate.get(date) ?? []),
          { id, date, topicId, kind: "mock", minutes: MOCK_MINUTES, status: "todo" },
        ]);
      });
    }

    const plan: Plan = {
      studentId,
      driveDate: student.driveDate,
      hoursPerDay: student.hoursPerDay,
      days: [...byDate.entries()]
        .filter(([, items]) => items.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => ({ date, items })),
    };
    await repo.savePlan(plan);
    return plan;
  }

  return {
    replan,

    async getPlan(studentId: string): Promise<Plan> {
      return replan(studentId);
    },

    async getNextTask(studentId: string): Promise<PlanItem> {
      const plan = await replan(studentId);
      for (const day of plan.days) {
        const next = day.items.find((i) => i.status === "todo");
        if (next) return next;
      }
      throw new EngineError("NOT_FOUND", "There is nothing left to do in the plan.");
    },

    async completePlanItem(itemId: string, status: "done" | "skipped"): Promise<Plan> {
      if (status !== "done" && status !== "skipped") {
        throw new EngineError("INVALID_STEP", `Invalid plan item status "${String(status)}".`);
      }
      const plan = await repo.findPlanByItemId(itemId);
      if (!plan) throw new EngineError("NOT_FOUND", `Unknown plan item "${itemId}".`);
      const item = plan.days.flatMap((d) => d.items).find((i) => i.id === itemId)!;
      if (item.status !== "todo") {
        throw new EngineError("INVALID_STEP", `Plan item "${itemId}" is already ${item.status}.`);
      }
      item.status = status;
      await repo.savePlan(plan);
      return replan(plan.studentId);
    },
  };
}

