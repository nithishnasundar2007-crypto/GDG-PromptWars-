// PRD §8.4 — a separate Vitest config for the real 30-answer eval run,
// deliberately NOT matched by vitest.config.ts's default include glob
// (src/**/*.test.ts), so `npm test` never runs it. Invoked on demand via
// `npm run eval -w web` (see docs/BACKEND1_REPORT.md for the mocked-AI-layer
// caveat — this sandbox has no live Gemini key).
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.ondemand.eval.ts"],
  },
});
