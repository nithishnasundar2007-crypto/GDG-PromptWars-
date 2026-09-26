// PRD §7.5/§9 — gemini.ts unit tests. The @google/genai SDK is mocked; no
// test calls the real Gemini API (there is no live key in this sandbox).

import { describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

describe("callGemini", () => {
  it("forwards systemInstruction/temperature/responseSchema and returns response.text", async () => {
    generateContent.mockResolvedValueOnce({ text: '{"ok":true}' });
    const { callGemini } = await import("./gemini.js");
    const text = await callGemini({
      systemInstruction: "sys",
      userContent: "user content",
      temperature: 0,
      responseSchema: { type: "object" },
    });
    expect(text).toBe('{"ok":true}');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: "user content",
        config: expect.objectContaining({ systemInstruction: "sys", temperature: 0, responseMimeType: "application/json" }),
      }),
    );
  });

  it("throws when Gemini returns no text", async () => {
    generateContent.mockResolvedValueOnce({ text: undefined });
    const { callGemini } = await import("./gemini.js");
    await expect(
      callGemini({ systemInstruction: "s", userContent: "u", temperature: 0, responseSchema: {} }),
    ).rejects.toThrow(/no text/);
  });
});

describe("callGeminiWithAudio", () => {
  it("sends inline audio data and returns response.text", async () => {
    generateContent.mockResolvedValueOnce({ text: '{"text":"hello"}' });
    const { callGeminiWithAudio } = await import("./gemini.js");
    const text = await callGeminiWithAudio({
      systemInstruction: "s",
      responseSchema: {},
      temperature: 0,
      audioBase64: "YWJj",
      mimeType: "audio/webm",
    });
    expect(text).toBe('{"text":"hello"}');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [{ inlineData: { mimeType: "audio/webm", data: "YWJj" } }],
      }),
    );
  });
});
