// PRD §7.5/§9 — the one place ai-proxy calls Gemini, via the official
// `@google/genai` SDK (hard rule §3.7 — migrated off the deprecated
// `@google/generative-ai`, see docs/CONFLICTS.md). JSON-schema structured
// output (`responseMimeType` + `responseSchema`) is used for every prompt.

import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

export interface GeminiCallOptions {
  systemInstruction: string;
  userContent: string;
  temperature: number;
  responseSchema: object;
}

/**
 * Calls Gemini with structured JSON output and returns the raw response text
 * (still a JSON string — schema validation happens in the route handler).
 * Throws on any transport/API failure; the caller is responsible for
 * timeouts (this function does not race against one itself, since the
 * client's underlying fetch already respects the caller's AbortSignal if one
 * is ever added — none is needed today because Express's own request timeout
 * bounds this).
 */
export async function callGemini(options: GeminiCallOptions): Promise<string> {
  const response = await client.models.generateContent({
    model: config.geminiModel,
    contents: options.userContent,
    config: {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature,
      responseMimeType: "application/json",
      responseSchema: options.responseSchema,
    },
  });
  const text = response.text;
  if (text === undefined) {
    throw new Error("Gemini returned no text content");
  }
  return text;
}
