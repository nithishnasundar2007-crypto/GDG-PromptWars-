// PRD §7.5/§3.2 — additional route-coverage tests: every /v1/* operation's
// happy path, the rate-limit and App Check rejection branches (both mocked
// at their own module boundary, not exercised via real timing/tokens), and
// /v1/transcribe's full path. No test calls the real Gemini API.

import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("./gemini.js", () => ({
  callGemini: vi.fn(async () => JSON.stringify({ ok: true })),
  callGeminiWithAudio: vi.fn(async () => JSON.stringify({ text: "hello" })),
}));
vi.mock("./rateLimit.js", () => ({ allow: vi.fn(() => true) }));
vi.mock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => true) }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("every /v1/* operation's happy path", () => {
  it("POST /v1/verify", async () => {
    const { createApp } = await import("./app.js");
    const res = await request(createApp())
      .post("/v1/verify")
      .send({ point: { id: "p1", text: "t", required: true }, spans: ["a span"] });
    expect(res.status).toBe(200);
  });

  it("POST /v1/explain", async () => {
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/explain").send({ question: "q", step: "explain", answer: "a" });
    expect(res.status).toBe(200);
  });

  it("POST /v1/project-questions", async () => {
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/project-questions").send({ projectText: "a project" });
    expect(res.status).toBe(200);
  });

  it("POST /v1/transcribe", async () => {
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/transcribe").send({ audioBase64: "YWJj", mimeType: "audio/webm" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: "hello" });
  });

  it("POST /v1/transcribe rejects a schema-invalid body", async () => {
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/transcribe").send({ nonsense: true });
    expect(res.status).toBe(400);
  });
});

describe("rate limit and App Check rejection branches", () => {
  it("rejects with 429 when the rate limiter says no", async () => {
    vi.resetModules();
    vi.doMock("./rateLimit.js", () => ({ allow: vi.fn(() => false) }));
    vi.doMock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => true) }));
    vi.doMock("./gemini.js", () => ({ callGemini: vi.fn(), callGeminiWithAudio: vi.fn() }));
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/grade").send({ question: "q", step: "explain", rubricPoints: [], answer: "a" });
    expect(res.status).toBe(429);
    vi.doUnmock("./rateLimit.js");
  });

  it("rejects with 401 when App Check verification fails", async () => {
    vi.resetModules();
    vi.doMock("./rateLimit.js", () => ({ allow: vi.fn(() => true) }));
    vi.doMock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => false) }));
    vi.doMock("./gemini.js", () => ({ callGemini: vi.fn(), callGeminiWithAudio: vi.fn() }));
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/grade").send({ question: "q", step: "explain", rubricPoints: [], answer: "a" });
    expect(res.status).toBe(401);
    vi.doUnmock("./security.js");
  });

  it("/v1/transcribe also rejects with 429 when the rate limiter says no", async () => {
    vi.resetModules();
    vi.doMock("./rateLimit.js", () => ({ allow: vi.fn(() => false) }));
    vi.doMock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => true) }));
    vi.doMock("./gemini.js", () => ({ callGemini: vi.fn(), callGeminiWithAudio: vi.fn() }));
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/transcribe").send({ audioBase64: "YWJj", mimeType: "audio/webm" });
    expect(res.status).toBe(429);
  });

  it("/v1/transcribe also rejects with 401 when App Check fails", async () => {
    vi.resetModules();
    vi.doMock("./rateLimit.js", () => ({ allow: vi.fn(() => true) }));
    vi.doMock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => false) }));
    vi.doMock("./gemini.js", () => ({ callGemini: vi.fn(), callGeminiWithAudio: vi.fn() }));
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/transcribe").send({ audioBase64: "YWJj", mimeType: "audio/webm" });
    expect(res.status).toBe(401);
  });

  it("/v1/transcribe returns 502 (never a stack trace) when the Gemini audio call fails", async () => {
    vi.resetModules();
    vi.doMock("./rateLimit.js", () => ({ allow: vi.fn(() => true) }));
    vi.doMock("./security.js", () => ({ verifyAppCheckToken: vi.fn(async () => true) }));
    vi.doMock("./gemini.js", () => ({
      callGemini: vi.fn(),
      callGeminiWithAudio: vi.fn(async () => {
        throw new Error("boom at /some/path.ts:1");
      }),
    }));
    const { createApp } = await import("./app.js");
    const res = await request(createApp()).post("/v1/transcribe").send({ audioBase64: "YWJj", mimeType: "audio/webm" });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain("boom");
  });
});
