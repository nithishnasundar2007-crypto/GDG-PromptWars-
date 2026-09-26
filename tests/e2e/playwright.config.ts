import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  webServer: {
    command: "npm run dev -w web",
    cwd: "../..",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: { VITE_USE_MOCKS: "true" },
  },
  use: {
    baseURL: "http://localhost:5173",
  },
});
