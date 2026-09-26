// API Contract section 5.2 — the scripted mock implementation of CompassApi.
// Written first so every screen can be built before the real engine/grading
// modules exist. Set VITE_USE_MOCKS=true (the default until M2) to route
// lib/api here instead of the real implementation.
//
// No screen may depend on a field that only exists here and not in types.ts —
// this file is typed as CompassApi precisely so that can't happen silently.

import type { CompassApi } from "./api";
import { ok } from "./errors";
import type {
  AnyStep,
  Attempt,
  Company,
  Debrief,
  Drill,
  Gap,
  GradeResult,
  LadderState,
  Plan,
  PlanItem,
  ProjectCardItem,
  ProjectQuestion,
  Question,
  ReadinessMap,
  Student,
  SubmitResult,
  Topic,
} from "./types";

// ---------------------------------------------------------------------------
// Seed content: 1 company, 3 rounds, topics = graphs, SQL joins, project
// explanation, plus one HR topic so the HR readiness block has data.
// ---------------------------------------------------------------------------

const topics: Topic[] = [
  { id: "tp_graphs", name: "Graphs", track: "technical", area: "dsa" },
  { id: "tp_sql_joins", name: "SQL Joins", track: "technical", area: "dbms" },
  { id: "tp_project", name: "Project Explanation", track: "technical", area: "project" },
  { id: "tp_hr_communication", name: "Behavioural", track: "hr", area: "hr" },
];

const company: Company = {
  id: "co_zoho",
  name: "Zoho",
  rounds: [
    {
      id: "rd_coding",
      name: "Coding",
      order: 1,
      topics: [
        { topicId: "tp_graphs", weight: 5 },
        { topicId: "tp_sql_joins", weight: 4 },
      ],
    },
    {
      id: "rd_technical",
      name: "Technical",
      order: 2,
      topics: [{ topicId: "tp_project", weight: 3 }],
    },
    {
      id: "rd_hr",
      name: "HR",
      order: 3,
      topics: [{ topicId: "tp_hr_communication", weight: 2 }],
    },
  ],
};

const bfsQuestion: Question = {
  id: "q_bfs_probe",
  topicId: "tp_graphs",
  track: "technical",
  role: "probe",
  prompt: "Given a graph and a start node, find the shortest path to a target node.",
  lang: "python",
  starterCode: "def shortest_path(graph, start, target):\n    pass\n",
  hint: "Which traversal visits nodes level by level?",
  rubrics: {
    recognize: [
      { id: "rp_1", text: "Names BFS and says why it gives the shortest path", required: true },
    ],
    explain: [
      { id: "rp_2", text: "Explains why BFS guarantees shortest path in an unweighted graph", required: true },
    ],
  },
  tests: [
    { id: "t1", input: "small graph, adjacent nodes", expected: "1", hidden: false },
    { id: "t2", input: "graph with 4 hops to target", expected: "4", hidden: true },
  ],
  variant: {
    prompt: "Now the graph is weighted with unit-or-double edge costs. Adapt your approach.",
    tests: [{ id: "t3", input: "weighted 4-hop graph", expected: "4", hidden: true }],
  },
  targetTimeMs: { recognize: 60_000, apply: 300_000, explain: 90_000, transfer: 240_000 },
  followUp: "What would you change if the graph had millions of nodes?",
};

const sqlJoinQuestion: Question = {
  id: "q_sql_join_probe",
  topicId: "tp_sql_joins",
  track: "technical",
  role: "probe",
  prompt: "Write a query to list every student and their enrolled course, including students with no course.",
  lang: "sql",
  starterCode: "SELECT ...\n",
  hint: "Which join keeps rows from the left table even without a match?",
  rubrics: {
    recognize: [{ id: "rp_3", text: "Names LEFT JOIN and why", required: true }],
  },
  tests: [{ id: "t4", input: "students + courses tables", expected: "all students, nullable course", hidden: true }],
  targetTimeMs: { recognize: 45_000, apply: 240_000 },
};

const questionsById: Record<string, Question> = {
  [bfsQuestion.id]: bfsQuestion,
  [sqlJoinQuestion.id]: sqlJoinQuestion,
};

// ---------------------------------------------------------------------------
// Scripted submitStep sequence, per §5.2:
// Recognize pass -> Apply fail (expected 4, got 5) -> Explain pass -> Transfer fail -> done
// ---------------------------------------------------------------------------

interface ScriptEntry {
  step: AnyStep;
  passed: boolean;
  next: AnyStep | "done";
}

const SCRIPT: ScriptEntry[] = [
  { step: "recognize", passed: true, next: "apply" },
  { step: "apply", passed: false, next: "explain" },
  { step: "explain", passed: true, next: "transfer" },
  { step: "transfer", passed: false, next: "done" },
];

const ladders = new Map<string, LadderState>();
const callIndexByLadder = new Map<string, number>();
let ladderCounter = 0;
let attemptCounter = 0;

function buildGrade(entry: ScriptEntry): GradeResult {
  if (entry.step === "apply" || entry.step === "transfer") {
    const firstFailure = entry.passed
      ? undefined
      : { testId: "t2", passed: false, timedOut: false, input: "graph with 4 hops to target", expected: "4", actual: "5" };
    return {
      step: entry.step,
      passed: entry.passed,
      run: {
        passed: entry.passed,
        results: firstFailure ? [firstFailure] : [{ testId: "t2", passed: true, timedOut: false }],
        runtimeMs: 120,
        // exactOptionalPropertyTypes: an optional field means absent, not
        // present-with-value-undefined — spread it in only when it exists.
        ...(firstFailure ? { firstFailure } : {}),
      },
      ...(entry.passed
        ? {}
        : {
            feedback: {
              whatHappened: "Your BFS visited the target one hop too late.",
              whyWrong: "An off-by-one in the distance counter overcounts by one hop.",
              missing: "The distance should increment when nodes are dequeued, not when they're enqueued.",
              nextDrill: "A debug drill on the same buggy BFS will target this exact bug.",
            },
          }),
    };
  }
  return {
    step: entry.step,
    passed: entry.passed,
    rubric: [
      {
        pointId: "rp_1",
        spans: ["BFS visits nodes level by level"],
        quoteMatched: true,
        verifierYes: entry.passed,
        met: entry.passed,
      },
    ],
    ...(entry.passed
      ? {}
      : {
          feedback: {
            whatHappened: "You named a traversal but didn't say why it's shortest-path safe.",
            whyWrong: "The point needs the guarantee, not just the algorithm name.",
            missing: "Unweighted graph + level-by-level visiting = first arrival is shortest.",
            nextDrill: "A short explainer on BFS's shortest-path guarantee.",
          },
        }),
  };
}

// ---------------------------------------------------------------------------
// Readiness Map: at least one cell in each state, one HR row.
// ---------------------------------------------------------------------------

function buildReadinessMap(): ReadinessMap {
  const graphsTopic = topics[0]!;
  const sqlTopic = topics[1]!;
  const projectTopic = topics[2]!;
  const hrTopic = topics[3]!;

  return {
    companyId: company.id,
    technical: [
      {
        topic: graphsTopic,
        weight: 5,
        cells: {
          recognize: { topicId: graphsTopic.id, step: "recognize", state: "green", attemptIds: ["att_1"] },
          apply: { topicId: graphsTopic.id, step: "apply", state: "amber", attemptIds: ["att_2"] },
          explain: { topicId: graphsTopic.id, step: "explain", state: "green", attemptIds: ["att_3"] },
          transfer: { topicId: graphsTopic.id, step: "transfer", state: "red", attemptIds: ["att_4"] },
        },
      },
      {
        topic: sqlTopic,
        weight: 4,
        cells: {
          recognize: { topicId: sqlTopic.id, step: "recognize", state: "grey", attemptIds: [] },
          apply: { topicId: sqlTopic.id, step: "apply", state: "grey", attemptIds: [] },
          explain: { topicId: sqlTopic.id, step: "explain", state: "grey", attemptIds: [] },
          transfer: { topicId: sqlTopic.id, step: "transfer", state: "grey", attemptIds: [] },
        },
      },
      {
        topic: projectTopic,
        weight: 3,
        cells: {
          recognize: { topicId: projectTopic.id, step: "recognize", state: "grey", attemptIds: [] },
          apply: { topicId: projectTopic.id, step: "apply", state: "grey", attemptIds: [] },
          explain: { topicId: projectTopic.id, step: "explain", state: "grey", attemptIds: [] },
          transfer: { topicId: projectTopic.id, step: "transfer", state: "grey", attemptIds: [] },
        },
      },
    ],
    hr: [
      {
        topic: hrTopic,
        weight: 2,
        cells: {
          structure: { topicId: hrTopic.id, step: "structure", state: "grey", attemptIds: [] },
          specifics: { topicId: hrTopic.id, step: "specifics", state: "grey", attemptIds: [] },
          followup: { topicId: hrTopic.id, step: "followup", state: "grey", attemptIds: [] },
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Plan: 6 days, one item of each kind somewhere in the sequence.
// ---------------------------------------------------------------------------

function buildPlan(studentId: string): Plan {
  const kinds: PlanItem["kind"][] = ["probe", "confirm", "drill", "retest", "mock"];
  const days = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const kind = kinds[i % kinds.length]!;
    const item: PlanItem = {
      id: `pi_${i + 1}`,
      date: date.toISOString().slice(0, 10),
      topicId: i % 2 === 0 ? "tp_graphs" : "tp_sql_joins",
      kind,
      minutes: 20,
      status: i === 0 ? "todo" : "todo",
    };
    return { date: item.date, items: [item] };
  });
  return { studentId, driveDate: days[5]!.date, hoursPerDay: 3, days };
}

// ---------------------------------------------------------------------------
// Project Defense: 6 questions across 4 areas.
// ---------------------------------------------------------------------------

const projectQuestions: ProjectQuestion[] = [
  { id: "pq_1", area: "architecture", text: "Why this database over the alternatives?", rubric: [{ id: "rpq_1", text: "Names a specific alternative and trade-off", required: true }] },
  { id: "pq_2", area: "architecture", text: "Why this framework for the frontend?", rubric: [{ id: "rpq_2", text: "Names a concrete constraint that drove the choice", required: true }] },
  { id: "pq_3", area: "tradeoffs", text: "What did you give up by choosing this approach?", rubric: [{ id: "rpq_3", text: "Names a real trade-off, not a generic one", required: true }] },
  { id: "pq_4", area: "failure-scaling", text: "What breaks first at 1,000 users?", rubric: [{ id: "rpq_4", text: "Names a specific bottleneck in this project", required: true }] },
  { id: "pq_5", area: "failure-scaling", text: "How would you scale the heaviest part of this system?", rubric: [{ id: "rpq_5", text: "Names a concrete scaling technique tied to the bottleneck", required: true }] },
  { id: "pq_6", area: "contribution", text: "Which part did you build, specifically?", rubric: [{ id: "rpq_6", text: "Names the student's own component, not the team's", required: true }] },
];

export const mockApi: CompassApi = {
  async initRunner() {
    return ok({ ready: true });
  },

  async runSample(questionId, _code, _step) {
    const question = questionsById[questionId];
    if (!question) return { ok: false, error: { code: "NOT_FOUND", message: "Unknown question", retryable: false } };
    return ok({
      passed: true,
      results: [{ testId: "t1", passed: true, timedOut: false }],
      runtimeMs: 80,
    });
  },

  async getCompanies() {
    return ok([company]);
  },

  async getRoundMap(companyId) {
    if (companyId !== company.id) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Unknown company", retryable: false } };
    }
    return ok({ company, topics });
  },

  async createStudent(input) {
    const student: Student = { ...input, id: "st_demo" };
    return ok(student);
  },

  async startLadder(studentId, topicId, role, step) {
    ladderCounter += 1;
    const ladderId = `ld_${ladderCounter}`;
    const question = topicId === "tp_sql_joins" ? sqlJoinQuestion : bfsQuestion;
    const ladder: LadderState = {
      id: ladderId,
      studentId,
      questionId: question.id,
      track: "technical",
      current: step ?? "recognize",
      assisted: false,
      outcomes: {},
      startedAt: new Date().toISOString(),
    };
    ladders.set(ladderId, ladder);
    callIndexByLadder.set(ladderId, 0);
    void role;
    return ok({ ladder, question });
  },

  async submitStep(ladderId, _answer, timeMs) {
    const ladder = ladders.get(ladderId);
    if (!ladder) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Unknown ladder", retryable: false } };
    }
    const idx = callIndexByLadder.get(ladderId) ?? 0;
    const entry = SCRIPT[Math.min(idx, SCRIPT.length - 1)]!;
    callIndexByLadder.set(ladderId, idx + 1);

    attemptCounter += 1;
    const attemptId = `att_${attemptCounter}`;
    const grade = buildGrade(entry);

    ladder.current = entry.next;
    ladder.outcomes[entry.step] = {
      passed: entry.passed,
      assisted: ladder.assisted,
      timeMs,
      attemptId,
    };
    if (!entry.passed && entry.step === "recognize") {
      ladder.assisted = true;
    }

    const gapsChanged: Gap[] =
      entry.passed || entry.step === "recognize"
        ? []
        : [
            {
              id: `gap_${entry.step}`,
              studentId: ladder.studentId,
              topicId: "tp_graphs",
              step: entry.step,
              type: entry.step === "apply" ? "coding" : entry.step === "transfer" ? "adapting" : "explaining",
              status: "suspected",
              attemptIds: [attemptId],
              updatedAt: new Date().toISOString(),
            },
          ];

    const result: SubmitResult = {
      grade,
      ladder,
      ...(ladder.current === "done" ? {} : { nextQuestionText: "Next question text would appear here." }),
      ...(ladder.assisted && entry.step === "recognize"
        ? { revealedApproach: "Use BFS: visit nodes level by level from the start." }
        : {}),
      gapsChanged,
      cellsChanged: [],
    };
    return ok(result);
  },

  async getReadinessMap(_studentId) {
    return ok(buildReadinessMap());
  },

  async getCellEvidence(studentId, topicId, step) {
    const attempt: Attempt = {
      id: "att_2",
      studentId,
      questionId: bfsQuestion.id,
      ladderId: "ld_1",
      step,
      answer: "def shortest_path(graph, start, target): ...",
      grade: buildGrade({ step: "apply", passed: false, next: "explain" }),
      assisted: false,
      timeMs: 180_000,
      createdAt: new Date().toISOString(),
    };
    return ok({
      cell: { topicId, step, state: "amber", attemptIds: [attempt.id] },
      attempts: [{ ...attempt, question: bfsQuestion }],
    });
  },

  async getPlan(studentId) {
    return ok(buildPlan(studentId));
  },

  async getNextTask(studentId) {
    const plan = buildPlan(studentId);
    return ok(plan.days[0]!.items[0]!);
  },

  async getDrill(gapId) {
    const drill: Drill = {
      id: `dr_${gapId}`,
      gapId,
      topicId: "tp_graphs",
      gapType: "coding",
      kind: "debug",
      title: "Find and fix the off-by-one in this BFS",
      content: "def shortest_path(graph, start, target):\n    # bug: distance incremented on enqueue, not dequeue\n    ...\n",
      minutes: 15,
      questionIds: [bfsQuestion.id],
    };
    return ok(drill);
  },

  async completePlanItem(_itemId, _status) {
    return ok(buildPlan("st_demo"));
  },

  async generateProjectQuestions(_projectText) {
    return ok(projectQuestions);
  },

  async gradeProjectAnswer(pq, _projectText, _answer) {
    const strong = pq.id === "pq_1";
    const grade: GradeResult = {
      step: "explain",
      passed: strong,
      rubric: pq.rubric.map((r) => ({
        pointId: r.id,
        spans: strong ? ["a specific, named trade-off"] : [],
        quoteMatched: strong,
        verifierYes: strong,
        met: strong,
      })),
      ...(strong
        ? {}
        : {
            feedback: {
              whatHappened: "The answer restated the question rather than naming a specific trade-off.",
              whyWrong: "No concrete alternative or constraint was named.",
              missing: "Name the alternative you considered and why you didn't pick it.",
              nextDrill: "Re-read the project text for the actual constraint that drove this choice.",
            },
          }),
    };
    const card: ProjectCardItem = {
      questionId: pq.id,
      strong,
      missing: strong ? [] : ["a specific alternative", "the constraint that ruled it out"],
      ...(strong ? {} : { modelOutline: "Mention the alternative, the constraint, and the concrete trade-off." }),
    };
    return ok({ grade, card });
  },

  async transcribe(_audio) {
    return ok({ text: "This is a placeholder transcript from the mock." });
  },

  async saveDebrief(input) {
    const debrief: Debrief = { ...input, id: "db_1", gapIds: ["gap_apply"] };
    return ok({ debrief, gaps: [] });
  },
};
