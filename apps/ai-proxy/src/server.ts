// Owner: Suchit. The one place GEMINI_API_KEY exists (docs/PHASE0_AUDIT.md
// sections I/J). Forwards validated requests from apps/web's grading/ai
// provider adapter to Gemini; checks origin; rate-limits; exposes a health
// route. Knows nothing about ladders, students, or Compass domain types.
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { config, CONTRACT_VERSION } from "./config.js";
import { PROMPTS, isPromptId } from "./prompts.js";
import { allow } from "./rateLimit.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== config.allowedOrigin) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", contractVersion: CONTRACT_VERSION });
});

const generateRequestSchema = z.object({
  promptId: z.string(),
  input: z.unknown(),
});

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

app.post("/api/generate", async (req, res) => {
  const clientId = req.ip ?? "unknown";
  if (!allow(clientId)) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }

  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.message });
    return;
  }

  const { promptId, input } = parsed.data;
  if (!isPromptId(promptId)) {
    res.status(400).json({ error: `Unknown promptId: ${promptId}` });
    return;
  }

  const promptDef = PROMPTS[promptId];
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: promptDef.systemInstruction,
    generationConfig: {
      temperature: promptDef.temperature,
      responseMimeType: "application/json",
      responseSchema: promptDef.responseSchema,
    },
  });

  try {
    const result = await model.generateContent(JSON.stringify(input));
    const text = result.response.text();
    res.json(JSON.parse(text));
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "Gemini call failed" });
  }
});

app.listen(config.port, () => {
  console.log(`ai-proxy listening on :${config.port} (contract ${CONTRACT_VERSION})`);
});
