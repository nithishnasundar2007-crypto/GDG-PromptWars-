// PRD §7.5/§3.2 — ai-proxy route tests (hard rule §3.4 suite 8). No test
// calls real Gemini — `callGemini` is mocked. Exercises: origin rejection,
// oversized body, unknown operation, schema-invalid body, and that the API
// key never appears in a response. App Check and rate-limit behavior are
// exercised via their own injectable seams (security.ts / rateLimit.ts).

import { describe, expect, it, vi, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { config } from "./config.js";

vi.mock("./gemini.js", () => ({
  callGemini: vi.fn(async () => JSON.stringify({ points: [] })),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /v1/health", () => {
  it("responds ok without touching Gemini", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("origin allow-list", () => {
  it("rejects a request from a disallowed origin", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/health").set("Origin", "https://evil.example.com");
    expect(res.status).toBe(403);
  });

  it("allows a request from the configured origin", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/health").set("Origin", config.allowedOrigin);
    expect(res.status).toBe(200);
  });
});

describe("POST /v1/grade", () => {
  const validBody = {
    question: "Why does BFS give the shortest path?",
    step: "explain",
    rubricPoints: [{ id: "rp_1", text: "Names BFS", required: true }],
    answer: "BFS explores level by level.",
  };

  it("rejects a schema-invalid body", async () => {
    const app = createApp();
    const res = await request(app).post("/v1/grade").send({ nonsense: true });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized body", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/v1/grade")
      .send({ ...validBody, answer: "x".repeat(300_000) });
    expect(res.status).toBe(413);
  });

  it("accepts a valid body and never echoes the Gemini API key anywhere in the response", async () => {
    const app = createApp();
    const res = await request(app).post("/v1/grade").send(validBody);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(config.geminiApiKey);
  });

  it("never returns a stack trace when the Gemini call fails", async () => {
    const { callGemini } = await import("./gemini.js");
    vi.mocked(callGemini).mockRejectedValueOnce(new Error("boom at /some/real/file/path.ts:42"));
    const app = createApp();
    const res = await request(app).post("/v1/grade").send(validBody);
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain(".ts:42");
    expect(JSON.stringify(res.body)).not.toContain("boom");
  });
});

describe("unknown operation", () => {
  it("returns 404 for a route outside the fixed /v1/* surface", async () => {
    const app = createApp();
    const res = await request(app).post("/api/generate").send({});
    expect(res.status).toBe(404);
  });
});
