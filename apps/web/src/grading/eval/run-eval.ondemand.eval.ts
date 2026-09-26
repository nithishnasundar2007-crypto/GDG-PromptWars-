// PRD §8.4 — the REAL 30+-answer eval run, on demand via
// `npm run eval -w web` (vitest.eval.config.ts's own include glob keeps this
// out of the default `npm test` / CI suite). Reads
// eval/labelled-answers/labelled.json, grades every item through the real
// gradeRubricStep pipeline against a mocked/deterministic AI layer (no live
// Gemini key in this sandbox — see docs/BACKEND1_REPORT.md), and writes
// eval/results/<promptVersion>.json plus a row in eval/REPORT.md.
//
// The fixture AI layer here is intentionally simple (it derives what the
// mock Grader/Verifier "say" from the human label itself), which is exactly
// what section 6 of this task's brief asks for: demonstrating the metric
// math and the pipeline's structural guarantees (quote matcher + Verifier
// default-to-no), NOT a claim about real Gemini's accuracy.

import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runEval } from "./run-eval";
import type { LabelledAnswer } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../../../");
const LABELLED_PATH = resolve(REPO_ROOT, "eval/labelled-answers/labelled.json");
const RESULTS_DIR = resolve(REPO_ROOT, "eval/results");
const REPORT_PATH = resolve(REPO_ROOT, "eval/REPORT.md");

const ROUTE_TO_PROMPT_ID: Record<string, string> = {
  "/v1/grade": "grader",
  "/v1/verify": "verifier",
};

function mockAiLayerFromLabels(labelled: LabelledAnswer[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const route = Object.keys(ROUTE_TO_PROMPT_ID).find((r) => url.endsWith(r));
      const promptId = route ? ROUTE_TO_PROMPT_ID[route] : "unknown";
      const input = JSON.parse(init.body as string) as { answer?: string; rubricPoints?: { id: string }[]; point?: { id: string } };

      if (promptId === "grader") {
        const item = labelled.find((l) => l.answer === input.answer);
        const points = (input.rubricPoints ?? []).map((p) => ({
          pointId: p.id,
          spans: item?.humanPointLabels[p.id] ? [item.answer] : [],
        }));
        return { ok: true, json: async () => ({ points }) };
      }
      const pointId = input.point?.id ?? "";
      const item = labelled.find((l) => pointId in l.humanPointLabels);
      const satisfied = item ? (item.humanPointLabels[pointId] ?? false) : false;
      return { ok: true, json: async () => ({ pointId, satisfied, reason: "fixture" }) };
    }),
  );
}

describe("real eval run (on demand, not part of CI)", () => {
  it("grades eval/labelled-answers/labelled.json and writes results + a REPORT.md row", async () => {
    const labelled = JSON.parse(readFileSync(LABELLED_PATH, "utf8")) as LabelledAnswer[];
    expect(labelled.length).toBeGreaterThanOrEqual(30);

    mockAiLayerFromLabels(labelled);
    const result = await runEval(labelled);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    const resultsPath = resolve(RESULTS_DIR, `${result.data.promptVersion}.json`);
    writeFileSync(resultsPath, JSON.stringify(result.data, null, 2) + "\n");

    const row = `| ${new Date().toISOString()} | ${result.data.promptVersion} | ${result.data.totalAnswers} | ${result.data.totalPoints} | ${(result.data.agreementRate * 100).toFixed(1)}% | ${(result.data.falseAwardRate * 100).toFixed(1)}% | ${(result.data.falseRejectRate * 100).toFixed(1)}% | mocked AI layer (no live Gemini key in this sandbox) |\n`;
    if (!existsSync(REPORT_PATH)) {
      writeFileSync(
        REPORT_PATH,
        "# Eval report log\n\nEach row is one `npm run eval -w web` run. See docs/BACKEND1_REPORT.md for what \"mocked AI layer\" means here and why it does not by itself prove the PRD §8.4 targets against real Gemini.\n\n| Date | Prompt version | Answers | Points | Agreement (target >=85%) | False-award (target <=5%) | False-reject (target <=10%) | Notes |\n|---|---|---|---|---|---|---|---|\n",
      );
    }
    appendFileSync(REPORT_PATH, row);

    // The mocked layer here is a lookup on the human label itself (see the
    // module doc comment), so it structurally cannot disagree — this run
    // proves the harness and pipeline wiring are correct, not real-world
    // Grader accuracy.
    expect(result.data.agreementRate).toBeGreaterThanOrEqual(0.85);
    expect(result.data.falseAwardRate).toBeLessThanOrEqual(0.05);
    expect(result.data.falseRejectRate).toBeLessThanOrEqual(0.1);
  });
});
