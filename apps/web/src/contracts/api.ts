// API Contract section 3.1 — the 17 functions the frontend calls. This is the
// literal shape both `mocks.ts` and the real `lib/api` implementation must
// satisfy; `lib/api/index.ts` picks one of them based on VITE_USE_MOCKS.
//
// If the backend later moves behind HTTP, each of these becomes
// `POST /api/v1/<functionName>` with the same request/response bodies — see
// docs/API_CONTRACT.md.

import type {
  Company,
  Debrief,
  Drill,
  Gap,
  LadderState,
  Plan,
  PlanItem,
  ProjectCardItem,
  ProjectQuestion,
  Question,
  QuestionRole,
  ReadinessMap,
  CellEvidence,
  Result,
  RunResult,
  Student,
  SubmitResult,
  Topic,
  AnyStep,
} from "./types";

export interface CompassApi {
  initRunner(): Promise<Result<{ ready: boolean }>>;

  runSample(
    questionId: string,
    code: string,
    step: "apply" | "transfer",
  ): Promise<Result<RunResult>>;

  getCompanies(): Promise<Result<Company[]>>;

  getRoundMap(companyId: string): Promise<Result<{ company: Company; topics: Topic[] }>>;

  createStudent(input: Omit<Student, "id">): Promise<Result<Student>>;

  startLadder(
    studentId: string,
    topicId: string,
    role: QuestionRole,
    step?: AnyStep,
  ): Promise<Result<{ ladder: LadderState; question: Question }>>;

  submitStep(
    ladderId: string,
    answer: string,
    timeMs: number,
  ): Promise<Result<SubmitResult>>;

  getReadinessMap(studentId: string): Promise<Result<ReadinessMap>>;

  getCellEvidence(
    studentId: string,
    topicId: string,
    step: AnyStep,
  ): Promise<Result<CellEvidence>>;

  getPlan(studentId: string): Promise<Result<Plan>>;

  getNextTask(studentId: string): Promise<Result<PlanItem>>;

  getDrill(gapId: string): Promise<Result<Drill>>;

  completePlanItem(
    itemId: string,
    status: "done" | "skipped",
  ): Promise<Result<Plan>>;

  generateProjectQuestions(projectText: string): Promise<Result<ProjectQuestion[]>>;

  gradeProjectAnswer(
    pq: ProjectQuestion,
    projectText: string,
    answer: string,
  ): Promise<Result<{ grade: import("./types").GradeResult; card: ProjectCardItem }>>;

  transcribe(audio: Blob): Promise<Result<{ text: string }>>;

  saveDebrief(
    input: Omit<Debrief, "id" | "gapIds">,
  ): Promise<Result<{ debrief: Debrief; gaps: Gap[] }>>;
}
