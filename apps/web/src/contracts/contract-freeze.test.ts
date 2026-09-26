// Contract freeze tests (hard rule §3.4 suite 1). Two independent checks:
//  1. a SHA-256 lock on types.ts itself, so ANY edit to the frozen contract
//     fails CI until CONTRACT.lock is deliberately re-generated and the
//     bump is reviewed (see docs/CONTRIBUTING.md's one-backend/one-frontend
//     approval rule, referenced at the top of types.ts);
//  2. expectTypeOf checks that grading's exported functions still match the
//     signatures this prompt's §2 froze, under the Result<T>-vs-throw
//     adapter resolution recorded in docs/CONFLICTS.md (grading/index.ts's
//     public exports resolve to plain data and throw on failure, matching
//     what apps/web/src/lib/api/index.ts already calls).

// `?raw` is a Vite/Vitest-native import suffix that inlines a file's text
// content at transform time — used here instead of node:fs so this test
// compiles under tsconfig.app.json's browser-only `types` list (no
// dependency on Node's fs/crypto/path type declarations).
import typesSource from "./types.ts?raw";
import lockFileContents from "./CONTRACT.lock?raw";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { AnyStep, Feedback, GradeResult, ProjectCardItem, ProjectQuestion, Question, RunResult, TestCase, Lang } from "./types";
import {
  configureGrading,
  explain,
  gradeStep,
  generateProjectQuestions,
  gradeProjectAnswer,
  initRunner,
  matchQuote,
  runCode,
  runSample,
  transcribe,
} from "../grading";

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("contract lock", () => {
  it("types.ts hasn't changed without a deliberate CONTRACT.lock bump", async () => {
    const hash = await sha256Hex(typesSource);
    expect(hash).toBe(lockFileContents.trim());
  });
});

describe("frozen grading signatures (§2, throw-adapter resolution)", () => {
  it("initRunner", () => {
    expectTypeOf(initRunner).returns.resolves.toEqualTypeOf<{ ready: boolean }>();
  });

  it("runSample", () => {
    expectTypeOf(runSample).parameters.toEqualTypeOf<[string, string, "apply" | "transfer"]>();
    expectTypeOf(runSample).returns.resolves.toEqualTypeOf<RunResult>();
  });

  it("runCode", () => {
    expectTypeOf(runCode).parameters.toEqualTypeOf<[string, Lang, TestCase[]]>();
    expectTypeOf(runCode).returns.resolves.toEqualTypeOf<RunResult>();
  });

  it("generateProjectQuestions", () => {
    expectTypeOf(generateProjectQuestions).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(generateProjectQuestions).returns.resolves.toEqualTypeOf<ProjectQuestion[]>();
  });

  it("gradeProjectAnswer", () => {
    expectTypeOf(gradeProjectAnswer).parameters.toEqualTypeOf<[ProjectQuestion, string, string]>();
    expectTypeOf(gradeProjectAnswer).returns.resolves.toEqualTypeOf<{ grade: GradeResult; card: ProjectCardItem }>();
  });

  it("transcribe", () => {
    expectTypeOf(transcribe).parameters.toEqualTypeOf<[Blob]>();
    expectTypeOf(transcribe).returns.resolves.toEqualTypeOf<{ text: string }>();
  });

  it("gradeStep", () => {
    expectTypeOf(gradeStep).parameters.toEqualTypeOf<[Question, AnyStep, string]>();
    expectTypeOf(gradeStep).returns.resolves.toEqualTypeOf<GradeResult>();
  });

  it("explain", () => {
    expectTypeOf(explain).parameters.toEqualTypeOf<[Question, AnyStep, string, GradeResult]>();
    expectTypeOf(explain).returns.resolves.toEqualTypeOf<Feedback>();
  });

  it("matchQuote — pure, synchronous, never wrapped in Result", () => {
    expectTypeOf(matchQuote).parameters.toEqualTypeOf<[string, string]>();
    expectTypeOf(matchQuote).returns.toEqualTypeOf<{ matched: boolean; similarity: number }>();
  });

  it("configureGrading exists for the runSample question-lookup wiring", () => {
    expectTypeOf(configureGrading).parameters.toEqualTypeOf<[{ getQuestion: (id: string) => Question | undefined }]>();
  });
});
