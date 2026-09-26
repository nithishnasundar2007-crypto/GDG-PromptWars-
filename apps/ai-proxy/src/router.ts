// PRD §7.5 — the fixed `/v1/*` operation surface (hard rule §3.2: "fixed
// /v1/* operations only, never an open relay"). Each route: rate-limit ->
// zod-validate body -> build the versioned prompt -> call Gemini -> validate
// the JSON came back well-formed -> respond. No stack traces ever reach a
// response body.

import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { CONTRACT_VERSION } from "./config.js";
import { callGemini, callGeminiWithAudio } from "./gemini.js";
import { logProxyCall } from "./logging.js";
import { PROMPTS } from "./prompts/index.js";
import { allow } from "./rateLimit.js";
import {
  explainRequestSchema,
  gradeRequestSchema,
  projectQuestionsRequestSchema,
  transcribeRequestSchema,
  verifyRequestSchema,
} from "./schemas.js";
import { verifyAppCheckToken } from "./security.js";

export const router = Router();

router.get("/v1/health", (_req, res) => {
  res.json({ status: "ok", contractVersion: CONTRACT_VERSION });
});

async function handleOperation(
  req: Request,
  res: Response,
  promptId: keyof typeof PROMPTS,
  bodySchema: z.ZodTypeAny,
): Promise<void> {
  const clientId = req.ip ?? "unknown";
  const start = Date.now();

  if (!allow(clientId)) {
    logProxyCall({ promptId, promptVersion: PROMPTS[promptId].version, latencyMs: Date.now() - start, outcome: "rejected", reason: "rate_limit" });
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }

  const appCheckOk = await verifyAppCheckToken(req.header("X-Firebase-AppCheck"));
  if (!appCheckOk) {
    logProxyCall({ promptId, promptVersion: PROMPTS[promptId].version, latencyMs: Date.now() - start, outcome: "rejected", reason: "app_check" });
    res.status(401).json({ error: "App Check verification failed" });
    return;
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    logProxyCall({ promptId, promptVersion: PROMPTS[promptId].version, latencyMs: Date.now() - start, outcome: "rejected", reason: "schema_invalid" });
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const promptDef = PROMPTS[promptId];
  try {
    const userContent = promptDef.build(parsed.data);
    const raw = await callGemini({
      systemInstruction: promptDef.systemInstruction,
      userContent,
      temperature: promptDef.temperature,
      responseSchema: promptDef.responseSchema,
    });
    const json: unknown = JSON.parse(raw);
    logProxyCall({ promptId, promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "ok" });
    res.json(json);
  } catch {
    // Never a stack trace or the underlying error message (which could echo
    // request content back) — a fixed, generic message only.
    logProxyCall({ promptId, promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "failed" });
    res.status(502).json({ error: "Gemini call failed" });
  }
}

router.post("/v1/grade", (req, res) => void handleOperation(req, res, "grader", gradeRequestSchema));
router.post("/v1/verify", (req, res) => void handleOperation(req, res, "verifier", verifyRequestSchema));
router.post("/v1/explain", (req, res) => void handleOperation(req, res, "explainer", explainRequestSchema));
router.post("/v1/project-questions", (req, res) => void handleOperation(req, res, "project-question-generator", projectQuestionsRequestSchema));

router.post("/v1/transcribe", (req, res) => {
  void (async () => {
    const clientId = req.ip ?? "unknown";
    const start = Date.now();
    const promptDef = PROMPTS.transcribe;

    if (!allow(clientId)) {
      logProxyCall({ promptId: "transcribe", promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "rejected", reason: "rate_limit" });
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    const appCheckOk = await verifyAppCheckToken(req.header("X-Firebase-AppCheck"));
    if (!appCheckOk) {
      logProxyCall({ promptId: "transcribe", promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "rejected", reason: "app_check" });
      res.status(401).json({ error: "App Check verification failed" });
      return;
    }

    const parsed = transcribeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      logProxyCall({ promptId: "transcribe", promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "rejected", reason: "schema_invalid" });
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    try {
      const raw = await callGeminiWithAudio({
        systemInstruction: promptDef.systemInstruction,
        responseSchema: promptDef.responseSchema,
        temperature: promptDef.temperature,
        audioBase64: parsed.data.audioBase64,
        mimeType: parsed.data.mimeType,
      });
      const json: unknown = JSON.parse(raw);
      logProxyCall({ promptId: "transcribe", promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "ok" });
      res.json(json);
    } catch {
      logProxyCall({ promptId: "transcribe", promptVersion: promptDef.version, latencyMs: Date.now() - start, outcome: "failed" });
      res.status(502).json({ error: "Gemini call failed" });
    }
  })();
});

router.use((req, res) => {
  res.status(404).json({ error: `Unknown operation: ${req.method} ${req.path}` });
});
