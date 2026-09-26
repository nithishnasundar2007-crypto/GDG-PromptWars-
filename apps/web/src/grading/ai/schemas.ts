// Owner: Suchit. zod schemas for API Contract §4's Gemini output shapes.
// Every response is validated against these; on failure, one retry, then
// GEMINI_BAD_JSON (see ai/index.ts).

import { z } from "zod";

export const graderOutputSchema = z.object({
  points: z.array(
    z.object({
      pointId: z.string(),
      spans: z.array(z.string()),
    }),
  ),
});

export const verifierOutputSchema = z.object({
  pointId: z.string(),
  satisfied: z.boolean(),
  reason: z.string(),
});

export const explainerOutputSchema = z.object({
  whatHappened: z.string(),
  whyWrong: z.string(),
  missing: z.string(),
  nextDrill: z.string(),
});

export const projectQuestionGeneratorOutputSchema = z.object({
  questions: z.array(
    z.object({
      area: z.enum(["architecture", "tradeoffs", "failure-scaling", "contribution"]),
      text: z.string(),
      rubric: z.array(z.object({ text: z.string(), required: z.boolean() })),
    }),
  ),
});
