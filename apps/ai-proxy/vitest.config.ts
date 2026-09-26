import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      GEMINI_API_KEY: "test-key-not-real",
      GEMINI_MODEL: "gemini-2.0-flash",
      ALLOWED_ORIGIN: "http://localhost:5173",
      PORT: "0",
      RATE_LIMIT_PER_MIN: "60",
      APP_CHECK_DEV_BYPASS: "true",
    },
  },
});
