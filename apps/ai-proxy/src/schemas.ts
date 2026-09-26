// PRD F9/F10/F12 — zod request-body schemas for each frozen /v1/* operation
// (hard rule §3.2: "every external boundary... validated with zod"). Length
// caps mirror apps/web/src/grading/config.ts's input limits (duplicated, not
// imported — ai-proxy is a separate deployable package).

import { z } from "zod";

const MAX_ANSWER_CHARS = 8_000;
const MAX_PROJECT_TEXT_CHARS = 20_000;

const rubricPointSchema = z.object({ id: z.string(), text: z.string(), required: z.boolean() });

export const gradeRequestSchema = z.object({
  question: z.string().max(4_000),
  step: z.string().max(64),
  rubricPoints: z.array(rubricPointSchema).max(20),
  answer: z.string().max(MAX_ANSWER_CHARS),
  context: z.string().max(MAX_PROJECT_TEXT_CHARS).optional(),
});

export const verifyRequestSchema = z.object({
  point: rubricPointSchema,
  spans: z.array(z.string().max(MAX_ANSWER_CHARS)).max(20),
});

export const explainRequestSchema = z.object({
  question: z.string().max(4_000),
  step: z.string().max(64),
  answer: z.string().max(MAX_ANSWER_CHARS),
  grade: z.unknown().optional(),
});

export const projectQuestionsRequestSchema = z.object({
  projectText: z.string().max(MAX_PROJECT_TEXT_CHARS),
});

// Base64-encoded audio, bounded generously above the 10MB raw-audio limit to
// account for base64's ~37% size overhead.
export const transcribeRequestSchema = z.object({
  audioBase64: z.string().max(14_000_000),
  mimeType: z.string().max(64),
});
