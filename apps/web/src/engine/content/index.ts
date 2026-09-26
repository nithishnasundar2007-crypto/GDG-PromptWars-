// Owner: Uthai. Loaders and validation for the seed bank (data/) and round
// maps. The data is static JSON bundled by Vite; nothing here touches storage.

import type { AnyStep, Company, GapType, Question, QuestionRole, Scope, Topic } from "../../contracts";
import { config } from "../../config";
import { EngineError } from "../errors";

const sprintCompanies = Object.values(
  import.meta.glob<Company>("../../data/companies/*.json", { eager: true, import: "default" }),
);
const twoWeekCompanies = Object.values(
  import.meta.glob<Company>("../../data/companies/two-week/*.json", { eager: true, import: "default" }),
);
const sprintTopics = Object.values(
  import.meta.glob<Topic[]>("../../data/topics.json", { eager: true, import: "default" }),
).flat();
const twoWeekTopics = Object.values(
  import.meta.glob<Topic[]>("../../data/topics.two-week.json", { eager: true, import: "default" }),
).flat();
const questions = Object.values(
  import.meta.glob<Question>("../../data/questions/**/*.json", { eager: true, import: "default" }),
).sort((a, b) => a.id.localeCompare(b.id));
const approaches: Record<string, string> = Object.assign(
  {},
  ...Object.values(
    import.meta.glob<Record<string, string>>("../../data/approaches.json", { eager: true, import: "default" }),
  ),
);
const drillTemplates = Object.values(
  import.meta.glob<DrillTemplate[]>("../../data/drills/templates.json", { eager: true, import: "default" }),
).flat();
const drillKinds: Record<GapType, DrillKind> = Object.assign(
  {},
  ...Object.values(
    import.meta.glob<Record<GapType, DrillKind>>("../../data/drills/gap-kinds.json", {
      eager: true,
      import: "default",
    }),
  ),
);
const debriefKeywordMap: Record<string, string[]> = Object.assign(
  {},
  ...Object.values(
    import.meta.glob<Record<string, string[]>>("../../data/debrief-keywords.json", {
      eager: true,
      import: "default",
    }),
  ),
);

export type DrillKind = "explainer" | "flashcards" | "debug" | "reexplain" | "variants" | "timed";

export interface DrillTemplate {
  topicId: string | null; // null = generic template for a gap type
  gapType: GapType;
  title: string;
  content: string;
  minutes: number;
  questionIds?: string[];
}

const TOPICS_BY_ID = new Map<string, Topic>([...sprintTopics, ...twoWeekTopics].map((t) => [t.id, t]));
const QUESTIONS_BY_ID = new Map<string, Question>(questions.map((q) => [q.id, q]));

/** Questions whose id ends in _drill exist only to be practised in a drill, never asked in a ladder. */
export function isDrillQuestion(q: Question): boolean {
  return q.id.endsWith("_drill");
}

// ---------------------------------------------------------------------------
// Companies, rounds, topics
// ---------------------------------------------------------------------------

export function companiesForScope(scope: Scope): Company[] {
  return scope === "two-week" ? twoWeekCompanies : sprintCompanies;
}

export function topicsForScope(scope: Scope): Topic[] {
  return scope === "two-week" ? [...sprintTopics, ...twoWeekTopics] : sprintTopics;
}

/** Looks in the given scope first, then the other one, so an existing student never loses their company. */
export function findCompany(companyId: string, scope: Scope): Company | undefined {
  return (
    companiesForScope(scope).find((c) => c.id === companyId) ??
    [...sprintCompanies, ...twoWeekCompanies].find((c) => c.id === companyId)
  );
}

export function getTopic(topicId: string): Topic | undefined {
  return TOPICS_BY_ID.get(topicId);
}

export function companyTopicIds(company: Company): string[] {
  return [...new Set(company.rounds.flatMap((r) => r.topics.map((t) => t.topicId)))];
}

/** Highest weight across rounds for each topic the company tests. */
export function topicWeights(company: Company): Map<string, number> {
  const weights = new Map<string, number>();
  for (const round of company.rounds) {
    for (const t of round.topics) weights.set(t.topicId, Math.max(weights.get(t.topicId) ?? 0, t.weight));
  }
  return weights;
}

export async function getCompanies(scope: Scope = config.scope): Promise<Company[]> {
  return companiesForScope(scope);
}

export async function getRoundMap(
  companyId: string,
  scope: Scope = config.scope,
): Promise<{ company: Company; topics: Topic[] }> {
  const company = findCompany(companyId, scope);
  if (!company) throw new EngineError("NOT_FOUND", `Unknown company "${companyId}".`);
  const topics = companyTopicIds(company)
    .map((id) => getTopic(id))
    .filter((t): t is Topic => t !== undefined);
  return { company, topics };
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export function getQuestion(questionId: string): Question | undefined {
  return QUESTIONS_BY_ID.get(questionId);
}

export function ladderQuestionsForTopic(topicId: string): Question[] {
  return questions.filter((q) => q.topicId === topicId && !isDrillQuestion(q));
}

/** Topics in the scope that have no ladder questions yet (the planner cannot probe these). */
export function topicsMissingQuestions(scope: Scope): Topic[] {
  return topicsForScope(scope).filter((t) => !hasLadderQuestions(t.id));
}

export function hasLadderQuestions(topicId: string): boolean {
  return ladderQuestionsForTopic(topicId).length > 0;
}

const ROLE_ORDER: QuestionRole[] = ["probe", "confirm", "retest"];

/**
 * Picks the question for a ladder. Prefers an unseen question of the requested
 * role, then an unseen question of another role, and only then repeats one the
 * student has already attempted (`fresh: false`), so a re-test is a new
 * question whenever the bank has one.
 */
export function pickQuestion(
  topicId: string,
  role: QuestionRole,
  seenQuestionIds: ReadonlySet<string>,
): { question: Question; fresh: boolean } | undefined {
  const pool = ladderQuestionsForTopic(topicId);
  const rank = (q: Question) => (q.role === role ? 0 : 1 + ROLE_ORDER.indexOf(q.role));
  const ordered = [...pool].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const unseen = ordered.find((q) => !seenQuestionIds.has(q.id));
  if (unseen) return { question: unseen, fresh: true };
  const repeat = ordered[0];
  return repeat ? { question: repeat, fresh: false } : undefined;
}

/** The approach shown when the Hint step fails: hand-written where available, else built from the rubric. */
export function approachFor(question: Question): string {
  const written = approaches[question.id];
  if (written) return written;
  const points = (question.rubrics.recognize ?? question.rubrics.structure ?? []).filter((p) => p.required);
  return points.length ? `A strong answer: ${points.map((p) => p.text).join("; ")}.` : "Review the approach and try again.";
}

/** Strips hidden tests' input/expected so a question can be shown to the student. */
export function redactHiddenTests(question: Question): Question {
  const redact = (t: Question["tests"]) =>
    t?.map((x) => (x.hidden ? { ...x, input: "", expected: "" } : x));
  return {
    ...question,
    tests: redact(question.tests),
    variant: question.variant ? { ...question.variant, tests: redact(question.variant.tests) ?? [] } : undefined,
  };
}

export function targetTimeFor(question: Question, step: AnyStep): number | undefined {
  return question.targetTimeMs[step];
}

// ---------------------------------------------------------------------------
// Drills and debrief keywords
// ---------------------------------------------------------------------------

export function drillKindFor(gapType: GapType): DrillKind {
  return drillKinds[gapType];
}

export function drillTemplateFor(topicId: string, gapType: GapType): DrillTemplate | undefined {
  return (
    drillTemplates.find((d) => d.topicId === topicId && d.gapType === gapType) ??
    drillTemplates.find((d) => d.topicId === null && d.gapType === gapType)
  );
}

export function debriefKeywords(): Record<string, string[]> {
  return debriefKeywordMap;
}

// ---------------------------------------------------------------------------
// Seed-bank validation (run by content/index.test.ts; mirrors scripts/validate-seeds)
// ---------------------------------------------------------------------------

const TECH_STEPS_WITH_RUBRIC: AnyStep[] = ["recognize", "hint", "explain"];
const HR_STEPS: AnyStep[] = ["structure", "specifics", "followup"];

export function validateSeedBank(): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const q of questions) {
    if (seenIds.has(q.id)) problems.push(`duplicate question id ${q.id}`);
    seenIds.add(q.id);
    if (!TOPICS_BY_ID.has(q.topicId)) problems.push(`${q.id}: unknown topic ${q.topicId}`);
    if (isDrillQuestion(q)) {
      if (q.lang && !q.tests?.length) problems.push(`${q.id}: drill question needs tests`);
      continue;
    }
    const required = q.track === "hr" ? HR_STEPS : TECH_STEPS_WITH_RUBRIC;
    for (const step of required) {
      if (!q.rubrics[step]?.length) problems.push(`${q.id}: missing rubric for step "${step}"`);
    }
    const rubricIds = Object.values(q.rubrics).flatMap((pts) => pts?.map((p) => p.id) ?? []);
    if (new Set(rubricIds).size !== rubricIds.length) problems.push(`${q.id}: duplicate rubric point ids`);
    if (!q.hint) problems.push(`${q.id}: missing hint`);
    if (!q.followUp) problems.push(`${q.id}: missing followUp`);
    if (q.track === "technical") {
      if (!q.variant) problems.push(`${q.id}: missing variant (Transfer step)`);
      if (q.lang) {
        if (!q.tests?.some((t) => t.hidden)) problems.push(`${q.id}: needs hidden Apply tests`);
        if (!q.tests?.some((t) => !t.hidden)) problems.push(`${q.id}: needs a visible sample test`);
        if (!q.variant?.tests.some((t) => t.hidden)) problems.push(`${q.id}: needs hidden Transfer tests`);
      } else if (!q.rubrics.apply?.length || !q.rubrics.transfer?.length) {
        problems.push(`${q.id}: non-code question needs apply and transfer rubrics`);
      }
    }
  }

  for (const [scope, companies] of [["sprint", sprintCompanies], ["two-week", twoWeekCompanies]] as const) {
    for (const c of companies) {
      for (const r of c.rounds) {
        for (const t of r.topics) {
          if (!TOPICS_BY_ID.has(t.topicId)) problems.push(`${scope}/${c.id}: unknown topic ${t.topicId}`);
          if (t.weight < 1 || t.weight > 5) problems.push(`${scope}/${c.id}/${r.id}: weight ${t.weight} outside 1-5`);
        }
      }
    }
  }

  for (const t of drillTemplates) {
    if (t.topicId && !TOPICS_BY_ID.has(t.topicId)) problems.push(`drill "${t.title}": unknown topic ${t.topicId}`);
    for (const id of t.questionIds ?? []) {
      if (!QUESTIONS_BY_ID.has(id)) problems.push(`drill "${t.title}": unknown question ${id}`);
    }
  }
  return problems;
}
